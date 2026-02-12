export type GroupCtx = { bg: string };

export function hashStringToInt(s: string): number {
    let h = 2166136261; // FNV-1a-ish
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function colorFromId(id: string): string {
    const n = hashStringToInt(id);

    const hue = n % 360;

    // Keep saturation strong but not neon
    const sat = 45 + (n % 15); // 45–59%

    // Dark background range
    const light = 18 + (n % 10); // 18–27%

    return `hsl(${hue} ${sat}% ${light}%)`;
}
