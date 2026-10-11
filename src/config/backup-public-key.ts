// Public half of the owner's backup key. Not a secret: it can only encrypt.
// The private key stays with the owner (Documents/TradingLab-Backups/backup-private-key.pem) and never enters Git, Render or CI.
// Fingerprint (SHA-256 of SPKI DER): a539d19dee549204ae2287a3a3fce503d4596c3a36e24bd24c87c5df1d86bd6c
export const BACKUP_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAyyX5IrJoLsIh+EguzgwP
FpGCxbNsi/rq6i90/oHF5a+p5jivcTyzxG9CxMDpk9fZP0BsoJs8F6ma4vv358EH
Oia/j4QGfz9CDaroFBMjUh6puLZoBeFN7ku3mxtd+foSjkCtVBwPLTxeQ1ZH26+8
VawJtrf8x+gObousebJzLaSbMqV/rzKdhU0LYDWkgOx5wnKs2VKRsPoCQUaaW9Op
TeU/jYTm7jgO7PdVTX0FpNk3c9/vGcmWz72+4dmJNaeRwke7C4IjQzM+UGBW92gk
z0iEfM3NTqy5VKLlAdCLDQwA0OK7ywNgm8WUg5UkccKjZP8f7Xbcgv2qYpggaMDV
SWo3r9KjD+Ss1NeVcH6zQNazncDcb3jjsP3UwOUxp8uTrkNchjpICERWAYnKAg6t
/K1n3/jt8wkNWiHL5yQCxvn1Khu3s8kcGDX/O3pBCf2y71bylKjX3+JcCsb/Rrdf
h8SbCZqAw+PMdmIuxJJ3l52tHSvdCNYLh7KZZJ7eiDJY8GreaInE2rGU6QS+xDct
AIv8HC3ty0AwupsE7SuMCCdffmL5pjaoQpl0i/TqDuwrDr9Ju8WQ8c5ilHmpJqKl
ZilQ7Pk7xzxKgwX2IAr4BdMoIt/dGprv/pMQitEzdTghQLvw/RT/uc8pWhdIboPK
8ZctiVfQ+XCzCDOSCU54g2ECAwEAAQ==
-----END PUBLIC KEY-----`;
export const BACKUP_PUBLIC_KEY_FINGERPRINT = 'a539d19dee549204ae2287a3a3fce503d4596c3a36e24bd24c87c5df1d86bd6c';
