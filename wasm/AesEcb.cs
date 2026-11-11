// AES-ECB decryption in plain C#. Needed only in the browser, where .NET has no AES
// (System.Security.Cryptography.Aes throws PlatformNotSupportedException on WebAssembly).
// Table-based "equivalent inverse cipher" from FIPS-197. Not constant-time: fine here, the key sits in the replay file itself.
using System.Buffers.Binary;

static class AesEcb
{
    static readonly byte[] S = new byte[256], Si = new byte[256];
    static readonly uint[] Td0 = new uint[256], Td1 = new uint[256], Td2 = new uint[256], Td3 = new uint[256];

    static AesEcb()
    {
        // S-box: multiplicative inverse in GF(2^8) followed by the affine transform.
        byte p = 1, q = 1;
        do
        {
            p = (byte)(p ^ (p << 1) ^ ((p & 0x80) != 0 ? 0x1B : 0));
            q ^= (byte)(q << 1); q ^= (byte)(q << 2); q ^= (byte)(q << 4);
            if ((q & 0x80) != 0) q ^= 0x09;
            byte x = (byte)(q ^ Rot(q, 1) ^ Rot(q, 2) ^ Rot(q, 3) ^ Rot(q, 4) ^ 0x63);
            S[p] = x; Si[x] = p;
        } while (p != 1);
        S[0] = 0x63; Si[0x63] = 0;

        for (int i = 0; i < 256; i++)
        {
            byte v = Si[i];
            uint t = (uint)(Mul(v, 14) << 24 | Mul(v, 9) << 16 | Mul(v, 13) << 8 | Mul(v, 11));
            Td0[i] = t; Td1[i] = t >> 8 | t << 24; Td2[i] = t >> 16 | t << 16; Td3[i] = t >> 24 | t << 8;
        }
    }

    static byte Rot(byte b, int n) => (byte)(b << n | b >> (8 - n));

    static byte Mul(byte a, byte b)
    {
        byte r = 0;
        for (; b != 0; b >>= 1) { if ((b & 1) != 0) r ^= a; a = (byte)(a << 1 ^ ((a & 0x80) != 0 ? 0x1B : 0)); }
        return r;
    }

    static uint Sub(uint w) => (uint)(S[w >> 24] << 24 | S[w >> 16 & 255] << 16 | S[w >> 8 & 255] << 8 | S[w & 255]);

    /// <summary>Decrypts whole blocks and strips PKCS7 padding. Key is 16, 24 or 32 bytes.</summary>
    public static byte[] Decrypt(ReadOnlySpan<byte> key, ReadOnlySpan<byte> data)
    {
        if (key.Length is not (16 or 24 or 32)) throw new ArgumentException("AES key must be 16, 24 or 32 bytes");
        if (data.Length == 0 || data.Length % 16 != 0) throw new ArgumentException("AES data must be a whole number of 16-byte blocks");
        int nk = key.Length / 4, nr = nk + 6;

        var w = new uint[4 * (nr + 1)];
        for (int i = 0; i < nk; i++) w[i] = BinaryPrimitives.ReadUInt32BigEndian(key[(4 * i)..]);
        uint rcon = 1;
        for (int i = nk; i < w.Length; i++)
        {
            uint t = w[i - 1];
            if (i % nk == 0) { t = Sub(t << 8 | t >> 24) ^ rcon << 24; rcon = Mul((byte)rcon, 2); }
            else if (nk > 6 && i % nk == 4) t = Sub(t);
            w[i] = w[i - nk] ^ t;
        }
        // Decryption keys: encryption round keys in reverse order, middle ones passed through InvMixColumns.
        var dk = new uint[w.Length];
        for (int r = 0; r <= nr; r++)
            for (int c = 0; c < 4; c++)
            {
                uint v = w[4 * (nr - r) + c];
                dk[4 * r + c] = r == 0 || r == nr ? v : Td0[S[v >> 24]] ^ Td1[S[v >> 16 & 255]] ^ Td2[S[v >> 8 & 255]] ^ Td3[S[v & 255]];
            }

        var output = new byte[data.Length];
        for (int o = 0; o < data.Length; o += 16)
        {
            uint s0 = BinaryPrimitives.ReadUInt32BigEndian(data[o..]) ^ dk[0], s1 = BinaryPrimitives.ReadUInt32BigEndian(data[(o + 4)..]) ^ dk[1];
            uint s2 = BinaryPrimitives.ReadUInt32BigEndian(data[(o + 8)..]) ^ dk[2], s3 = BinaryPrimitives.ReadUInt32BigEndian(data[(o + 12)..]) ^ dk[3];
            int k = 4;
            for (int r = 1; r < nr; r++, k += 4)
            {
                uint t0 = Td0[s0 >> 24] ^ Td1[s3 >> 16 & 255] ^ Td2[s2 >> 8 & 255] ^ Td3[s1 & 255] ^ dk[k];
                uint t1 = Td0[s1 >> 24] ^ Td1[s0 >> 16 & 255] ^ Td2[s3 >> 8 & 255] ^ Td3[s2 & 255] ^ dk[k + 1];
                uint t2 = Td0[s2 >> 24] ^ Td1[s1 >> 16 & 255] ^ Td2[s0 >> 8 & 255] ^ Td3[s3 & 255] ^ dk[k + 2];
                uint t3 = Td0[s3 >> 24] ^ Td1[s2 >> 16 & 255] ^ Td2[s1 >> 8 & 255] ^ Td3[s0 & 255] ^ dk[k + 3];
                s0 = t0; s1 = t1; s2 = t2; s3 = t3;
            }
            var block = output.AsSpan(o);
            BinaryPrimitives.WriteUInt32BigEndian(block, (uint)(Si[s0 >> 24] << 24 | Si[s3 >> 16 & 255] << 16 | Si[s2 >> 8 & 255] << 8 | Si[s1 & 255]) ^ dk[k]);
            BinaryPrimitives.WriteUInt32BigEndian(block[4..], (uint)(Si[s1 >> 24] << 24 | Si[s0 >> 16 & 255] << 16 | Si[s3 >> 8 & 255] << 8 | Si[s2 & 255]) ^ dk[k + 1]);
            BinaryPrimitives.WriteUInt32BigEndian(block[8..], (uint)(Si[s2 >> 24] << 24 | Si[s1 >> 16 & 255] << 16 | Si[s0 >> 8 & 255] << 8 | Si[s3 & 255]) ^ dk[k + 2]);
            BinaryPrimitives.WriteUInt32BigEndian(block[12..], (uint)(Si[s3 >> 24] << 24 | Si[s2 >> 16 & 255] << 16 | Si[s1 >> 8 & 255] << 8 | Si[s0 & 255]) ^ dk[k + 3]);
        }

        int pad = output[^1];
        if (pad is < 1 or > 16 || output.AsSpan(output.Length - pad).ContainsAnyExcept((byte)pad)) throw new InvalidDataException("bad AES padding: wrong key or damaged data");
        return output[..^pad];
    }

    /// <summary>Checks this code against the platform AES on random data of several sizes. Throws on any difference.</summary>
    public static void SelfTest()
    {
        var rng = new Random(1);
        foreach (int keySize in (int[])[16, 24, 32])
            foreach (int size in (int[])[0, 1, 15, 16, 17, 1000])
            {
                byte[] key = new byte[keySize], plain = new byte[size];
                rng.NextBytes(key); rng.NextBytes(plain);
                using var aes = System.Security.Cryptography.Aes.Create();
                aes.Key = key;
                var cipher = aes.EncryptEcb(plain, System.Security.Cryptography.PaddingMode.PKCS7);
                if (!Decrypt(key, cipher).AsSpan().SequenceEqual(plain)) throw new Exception($"AesEcb self-test failed: key {keySize}, size {size}");
            }
    }
}
