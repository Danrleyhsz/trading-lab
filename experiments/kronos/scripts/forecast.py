"""Previsões do Kronos para o experimento KRONOS_AB_V1 (experiments/kronos/PROTOCOLO_KRONOS_AB_V1.md).

Só pesquisa histórica offline: lê um arquivo de velas públicas e grava previsões. Não tem acesso a corretora, ordens,
credenciais ou contas. Para cada origem t, o modelo recebe só velas com horário <= t; as velas depois de t nem são
passadas para o modelo (o alvo só é lido depois, na avaliação em TypeScript).

Uso (a partir de experiments/kronos):
  .venv/Scripts/python scripts/forecast.py --arm B --timeframe 1h
"""
import argparse, ctypes, hashlib, json, math, os, random, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# Só configuração e pesos: imagens e registros dos repositórios de modelo não são necessários.
WEIGHT_FILES = ['config.json', 'model.safetensors']
STEP = {'1h': 3600000, '4h': 4 * 3600000}


def load_config():
    with open(os.path.join(ROOT, 'configs', 'kronos_ab_v1.json'), encoding='utf-8') as f:
        return json.load(f)


def validate_candles(candles, step):
    """Recusa entrada inválida: fora de ordem, duplicada, com buraco, não finita ou com preço não positivo."""
    if not candles:
        raise ValueError('empty candles')
    for i, c in enumerate(candles):
        values = [c['open'], c['high'], c['low'], c['close'], c['volume']]
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in values):
            raise ValueError(f'non-finite candle at {c.get("timestamp")}')
        if min(c['open'], c['high'], c['low'], c['close']) <= 0 or c['volume'] < 0:
            raise ValueError(f'non-positive price at {c["timestamp"]}')
        if i and c['timestamp'] != candles[i - 1]['timestamp'] + step:
            raise ValueError(f'non-monotonic or discontinuous candles at {c["timestamp"]}')


def context_for(candles, index_by_ts, origin, length):
    """Janela de contexto que termina exatamente na vela `origin`; nada depois dela."""
    end = index_by_ts.get(origin)
    if end is None or end + 1 < length:
        raise ValueError(f'context unavailable for origin {origin}')
    window = candles[end + 1 - length:end + 1]
    assert window[-1]['timestamp'] == origin and all(c['timestamp'] <= origin for c in window)
    return window


def input_hash(window):
    canonical = [[c['timestamp'], c['open'], c['high'], c['low'], c['close'], c['volume']] for c in window]
    return hashlib.sha256(json.dumps(canonical, separators=(',', ':')).encode()).hexdigest()


def seed_for(origin):
    return (origin // 3600000) % 2147483647


def peak_memory_mb():
    """Memória de pico do processo (MB). No Windows, via GetProcessMemoryInfo com tipos explícitos (handle de 64 bits)."""
    if os.name != 'nt':
        import resource
        return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    import ctypes.wintypes as w
    class Counters(ctypes.Structure):
        _fields_ = [('cb', w.DWORD), ('PageFaultCount', w.DWORD), ('PeakWorkingSetSize', ctypes.c_size_t), ('WorkingSetSize', ctypes.c_size_t),
                    ('QuotaPeakPagedPoolUsage', ctypes.c_size_t), ('QuotaPagedPoolUsage', ctypes.c_size_t), ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t),
                    ('QuotaNonPagedPoolUsage', ctypes.c_size_t), ('PagefileUsage', ctypes.c_size_t), ('PeakPagefileUsage', ctypes.c_size_t)]
    kernel32, psapi = ctypes.WinDLL('kernel32'), ctypes.WinDLL('psapi')
    kernel32.GetCurrentProcess.restype = w.HANDLE
    psapi.GetProcessMemoryInfo.argtypes = [w.HANDLE, ctypes.POINTER(Counters), w.DWORD]
    counters = Counters(); counters.cb = ctypes.sizeof(Counters)
    if not psapi.GetProcessMemoryInfo(kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
        return float('nan')
    return counters.PeakWorkingSetSize / 1024 / 1024


def load_predictor(arm_cfg, sampling):
    """Carrega código e pesos nas revisões fixadas. Qualquer falha encerra sem previsões (falha fechada)."""
    os.environ.setdefault('HF_HOME', os.path.join(ROOT, '.cache', 'hf'))
    os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
    sys.path.insert(0, os.path.join(ROOT, 'vendor', 'Kronos'))
    import torch
    from huggingface_hub import snapshot_download
    from model import Kronos, KronosTokenizer, KronosPredictor
    torch.set_num_threads(sampling['torchThreads'])
    tok_dir = snapshot_download(arm_cfg['tokenizer'], revision=arm_cfg['tokenizerRevision'], allow_patterns=WEIGHT_FILES)
    mod_dir = snapshot_download(arm_cfg['model'], revision=arm_cfg['modelRevision'], allow_patterns=WEIGHT_FILES)
    tokenizer = KronosTokenizer.from_pretrained(tok_dir)
    model = Kronos.from_pretrained(mod_dir)
    model.eval(); tokenizer.eval()
    return KronosPredictor(model, tokenizer, device='cpu', max_context=arm_cfg['maxContext'], clip=sampling['clip'])


def forecast_one(predictor, window, step, pred_len, sampling, origin):
    import numpy as np, pandas as pd, torch
    random.seed(seed_for(origin)); np.random.seed(seed_for(origin)); torch.manual_seed(seed_for(origin))
    df = pd.DataFrame([{k: c[k] for k in ('open', 'high', 'low', 'close', 'volume')} for c in window])
    x_ts = pd.Series(pd.to_datetime([c['timestamp'] for c in window], unit='ms'))
    y_ts = pd.Series(pd.to_datetime([origin + step * k for k in range(1, pred_len + 1)], unit='ms'))
    with torch.no_grad():
        out = predictor.predict(df=df, x_timestamp=x_ts, y_timestamp=y_ts, pred_len=pred_len, T=sampling['T'], top_k=sampling['top_k'],
                                top_p=sampling['top_p'], sample_count=sampling['sample_count'], verbose=False)
    return {col: [float(v) for v in out[col].tolist()] for col in ('open', 'high', 'low', 'close', 'volume')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--arm', default='B')
    parser.add_argument('--timeframe', choices=['1h', '4h'], required=True)
    parser.add_argument('--limit', type=int, default=0, help='só as N primeiras origens (verificação)')
    parser.add_argument('--out', default=None)
    args = parser.parse_args()
    cfg = load_config(); arm = cfg['arms'][args.arm]
    # Braços com um modelo por tempo gráfico (ajuste de BTC) declaram model/tokenizer dentro de timeframes.
    arm = {**arm, **arm.get('timeframes', {}).get(args.timeframe, {})}
    # Emendas de amostragem por braço (declaradas antes de rodar) sobrescrevem só os campos que citam.
    tf = cfg['forecast']['timeframes'][args.timeframe]; sampling = {**cfg['forecast']['sampling'], **arm.get('sampling', {})}
    step = STEP[args.timeframe]
    data_path = os.path.join(ROOT, 'data', f'btc-{args.timeframe}.json')
    raw = open(data_path, 'rb').read(); data = json.loads(raw)
    candles = data['candles']; validate_candles(candles, step)
    origins = json.load(open(os.path.join(ROOT, 'data', 'origins.json'), encoding='utf-8'))[args.timeframe]
    if args.limit:
        origins = origins[:args.limit]
    index_by_ts = {c['timestamp']: i for i, c in enumerate(candles)}
    out_path = args.out or os.path.join(ROOT, 'results', f'forecasts-{args.arm}-{args.timeframe}.jsonl')
    done = set()
    if os.path.exists(out_path):
        for line in open(out_path, encoding='utf-8'):
            if line.strip():
                done.add(json.loads(line)['origin'])
    started = time.time()
    try:
        predictor = load_predictor(arm, sampling)
    except Exception as error:  # falha fechada: nenhuma previsão, a base continua intacta
        print(json.dumps({'status': 'MODEL_UNAVAILABLE', 'error': str(error)[:300]}))
        sys.exit(2)
    meta = {'arm': args.arm, 'model': arm['model'], 'modelRevision': arm['modelRevision'], 'tokenizer': arm['tokenizer'], 'tokenizerRevision': arm['tokenizerRevision'],
            'codeCommit': arm['codeCommit'], 'datasetSha256': hashlib.sha256(raw).hexdigest(), 'sampling': sampling, 'contextCandles': tf['contextCandles'], 'predLen': tf['predLen']}
    with open(out_path, 'a', encoding='utf-8') as out:
        for n, origin in enumerate(origins):
            if origin in done:
                continue
            record = {'timeframe': args.timeframe, 'origin': origin, **meta}
            t0 = time.time()
            try:
                window = context_for(candles, index_by_ts, origin, tf['contextCandles'])
                pred = forecast_one(predictor, window, step, tf['predLen'], sampling, origin)
                last = window[-1]['close']
                record.update({'contextStart': window[0]['timestamp'], 'contextEnd': window[-1]['timestamp'], 'inputSha256': input_hash(window), 'lastClose': last,
                               'predicted': pred, 'predictedClose': pred['close'], 'predictedReturn': pred['close'][-1] / last - 1})
            except Exception as error:  # previsão rejeitada fica registrada, nunca é inventada
                record.update({'error': str(error)[:300], 'predictedReturn': None})
            record['seconds'] = round(time.time() - t0, 3); record['peakMemoryMb'] = round(peak_memory_mb(), 1)
            out.write(json.dumps(record, separators=(',', ':')) + '\n'); out.flush()
            if n % 25 == 0:
                print(f'{args.timeframe} {n + 1}/{len(origins)} {record["seconds"]}s', flush=True)
    print(json.dumps({'status': 'DONE', 'origins': len(origins), 'seconds': round(time.time() - started, 1), 'peakMemoryMb': round(peak_memory_mb(), 1)}))


if __name__ == '__main__':
    main()
