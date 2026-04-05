/// Clamp a float to 0..255 and convert to u8.
#[inline]
pub fn clamp_u8(v: f32) -> u8 {
    v.max(0.0).min(255.0) as u8
}

/// RGB to HSL conversion. Input: 0-255 per channel. Output: h in 0..1, s in 0..1, l in 0..1.
pub fn rgb_to_hsl(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f32::EPSILON {
        return (0.0, 0.0, l);
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };
    let h = if (max - r).abs() < f32::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f32::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    (h, s, l)
}

/// HSL to RGB conversion. Input: h, s, l all in 0..1. Output: 0-255 per channel.
pub fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    if s.abs() < f32::EPSILON {
        let v = (l * 255.0).round();
        return (v, v, v);
    }

    let hue2rgb = |p: f32, q: f32, mut t: f32| -> f32 {
        if t < 0.0 {
            t += 1.0;
        }
        if t > 1.0 {
            t -= 1.0;
        }
        if t < 1.0 / 6.0 {
            return p + (q - p) * 6.0 * t;
        }
        if t < 0.5 {
            return q;
        }
        if t < 2.0 / 3.0 {
            return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
        }
        p
    };

    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;

    (
        (hue2rgb(p, q, h + 1.0 / 3.0) * 255.0).round(),
        (hue2rgb(p, q, h) * 255.0).round(),
        (hue2rgb(p, q, h - 1.0 / 3.0) * 255.0).round(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp_u8_lower_bound() {
        assert_eq!(clamp_u8(-10.0), 0);
    }

    #[test]
    fn test_clamp_u8_upper_bound() {
        assert_eq!(clamp_u8(300.0), 255);
    }

    #[test]
    fn test_clamp_u8_normal() {
        assert_eq!(clamp_u8(128.5), 128);
    }

    #[test]
    fn test_rgb_hsl_roundtrip() {
        let (h, s, l) = rgb_to_hsl(100.0, 150.0, 200.0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert!((r - 100.0).abs() <= 1.0);
        assert!((g - 150.0).abs() <= 1.0);
        assert!((b - 200.0).abs() <= 1.0);
    }

    #[test]
    fn test_greyscale_hsl() {
        // Pure grey should have zero saturation
        let (h, s, l) = rgb_to_hsl(128.0, 128.0, 128.0);
        assert_eq!(s, 0.0);
        assert!((l - 128.0 / 255.0).abs() < 0.01);
        let _ = h; // hue is undefined for grey
    }

    #[test]
    fn test_pure_white() {
        let (h, s, l) = rgb_to_hsl(255.0, 255.0, 255.0);
        assert_eq!(s, 0.0);
        assert!((l - 1.0).abs() < f32::EPSILON);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert!((r - 255.0).abs() <= 1.0);
        assert!((g - 255.0).abs() <= 1.0);
        assert!((b - 255.0).abs() <= 1.0);
    }

    #[test]
    fn test_pure_black() {
        let (_, s, l) = rgb_to_hsl(0.0, 0.0, 0.0);
        assert_eq!(s, 0.0);
        assert_eq!(l, 0.0);
    }
}
