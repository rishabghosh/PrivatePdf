/// Apply greyscale conversion to an RGBA pixel buffer in-place.
///
/// Uses the ITU-R BT.601 luma coefficients (0.299 R + 0.587 G + 0.114 B),
/// matching the JS implementation in image-effects.ts.
pub fn apply_greyscale(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;
        let grey = (0.299 * r + 0.587 * g + 0.114 * b).round() as u8;
        chunk[0] = grey;
        chunk[1] = grey;
        chunk[2] = grey;
        // chunk[3] (alpha) unchanged
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greyscale_single_pixel() {
        let mut pixels = vec![100, 150, 200, 255];
        apply_greyscale(&mut pixels);
        // 0.299*100 + 0.587*150 + 0.114*200 = 29.9 + 88.05 + 22.8 = 140.75 -> 141
        assert_eq!(pixels[0], 141);
        assert_eq!(pixels[1], 141);
        assert_eq!(pixels[2], 141);
        assert_eq!(pixels[3], 255); // alpha unchanged
    }

    #[test]
    fn test_greyscale_pure_white() {
        let mut pixels = vec![255, 255, 255, 255];
        apply_greyscale(&mut pixels);
        assert_eq!(pixels[0], 255);
        assert_eq!(pixels[1], 255);
        assert_eq!(pixels[2], 255);
    }

    #[test]
    fn test_greyscale_pure_black() {
        let mut pixels = vec![0, 0, 0, 255];
        apply_greyscale(&mut pixels);
        assert_eq!(pixels[0], 0);
        assert_eq!(pixels[1], 0);
        assert_eq!(pixels[2], 0);
    }

    #[test]
    fn test_greyscale_multiple_pixels() {
        let mut pixels = vec![
            255, 0, 0, 255, // red
            0, 255, 0, 255, // green
            0, 0, 255, 255, // blue
        ];
        apply_greyscale(&mut pixels);
        // Red: 0.299*255 = 76.245 -> 76
        assert_eq!(pixels[0], 76);
        // Green: 0.587*255 = 149.685 -> 150
        assert_eq!(pixels[4], 150);
        // Blue: 0.114*255 = 29.07 -> 29
        assert_eq!(pixels[8], 29);
    }

    #[test]
    fn test_greyscale_already_grey() {
        let mut pixels = vec![128, 128, 128, 200];
        apply_greyscale(&mut pixels);
        assert_eq!(pixels[0], 128);
        assert_eq!(pixels[1], 128);
        assert_eq!(pixels[2], 128);
        assert_eq!(pixels[3], 200); // alpha preserved
    }
}
