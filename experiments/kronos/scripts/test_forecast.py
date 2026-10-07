"""Testes do lado Python do KRONOS_AB_V1: entrada inválida, contexto sem futuro, vazamento, determinismo e falha fechada.

Uso (a partir de experiments/kronos): .venv/Scripts/python -m unittest scripts/test_forecast.py -v
Os testes com o modelo real são pulados se os pesos não estiverem no cache local.
"""
import copy, json, math, os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import forecast as F

H = 3600000


def synthetic(n, start=1767225600000):
    out = []
    for i in range(n):
        base = 100 * (1 + 0.001 * math.sin(i / 7)) * (1.0002 ** i)
        out.append({'timestamp': start + i * H, 'open': base, 'high': base * 1.003, 'low': base * 0.997, 'close': base * 1.001, 'volume': 10 + i % 5})
    return out


class InputContract(unittest.TestCase):
    def test_rejects_invalid_input(self):
        good = synthetic(10)
        F.validate_candles(good, H)
        dup = good[:5] + [good[4]] + good[5:]
        swapped = good[:3] + [good[4], good[3]] + good[5:]
        nan = copy.deepcopy(good); nan[2]['close'] = float('nan')
        gap = good[:4] + good[5:]
        negative = copy.deepcopy(good); negative[1]['low'] = -1
        for bad in (dup, swapped, nan, gap, negative):
            with self.assertRaises(ValueError):
                F.validate_candles(bad, H)

    def test_context_ends_at_origin_and_never_includes_future(self):
        candles = synthetic(100); index = {c['timestamp']: i for i, c in enumerate(candles)}
        origin = candles[60]['timestamp']
        window = F.context_for(candles, index, origin, 32)
        self.assertEqual(len(window), 32); self.assertEqual(window[-1]['timestamp'], origin)
        self.assertTrue(all(c['timestamp'] <= origin for c in window))
        future_changed = copy.deepcopy(candles)
        for c in future_changed[61:]:
            c['close'] *= 3
        self.assertEqual(F.input_hash(window), F.input_hash(F.context_for(future_changed, index, origin, 32)))
        with self.assertRaises(ValueError):
            F.context_for(candles, index, candles[10]['timestamp'], 32)


def weights_cached():
    hub = os.path.join(F.ROOT, '.cache', 'hf', 'hub')
    return all(os.path.isdir(os.path.join(hub, name)) for name in ('models--NeoQuasar--Kronos-mini', 'models--NeoQuasar--Kronos-Tokenizer-2k'))


@unittest.skipUnless(weights_cached(), 'pesos do Kronos-mini fora do cache local')
class RealModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['HF_HUB_OFFLINE'] = '1'
        cfg = F.load_config()
        cls.sampling = {**cfg['forecast']['sampling'], 'sample_count': 2}
        cls.predictor = F.load_predictor(cfg['arms']['B'], cls.sampling)
        cls.candles = synthetic(200); cls.index = {c['timestamp']: i for i, c in enumerate(cls.candles)}

    def run_at(self, candles, origin):
        index = {c['timestamp']: i for i, c in enumerate(candles)}
        return F.forecast_one(self.predictor, F.context_for(candles, index, origin, 64), H, 6, self.sampling, origin)

    def test_future_candles_do_not_change_the_forecast(self):
        origin = self.candles[120]['timestamp']
        changed = copy.deepcopy(self.candles)
        for c in changed[121:]:
            for k in ('open', 'high', 'low', 'close'):
                c[k] *= 2
        self.assertEqual(self.run_at(self.candles, origin), self.run_at(changed, origin))

    def test_same_seed_same_forecast(self):
        origin = self.candles[150]['timestamp']
        self.assertEqual(self.run_at(self.candles, origin), self.run_at(self.candles, origin))

    def test_unavailable_model_fails_closed(self):
        cfg = F.load_config(); bad = {**cfg['arms']['B'], 'modelRevision': '0' * 40}
        with self.assertRaises(Exception):
            F.load_predictor(bad, self.sampling)


if __name__ == '__main__':
    unittest.main()
