/// Apply color inversion to an RGBA pixel buffer in-place.
///
/// Each RGB channel is inverted (255 - value). Alpha is unchanged.
pub fn apply_invert(pixels: &mut [u8]) {
    for chunk in pixels.chunks_exact_mut(4) {
        chunk[0] = 255 - chunk[0];
        chunk[1] = 255 - chunk[1];
        chunk[2] = 255 - chunk[2];
        // chunk[3] (alpha) unchanged
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invert_single_pixel() {
        let mut pixels = vec![100, 150, 200, 255];
        apply_invert(&mut pixels);
        assert_eq!(pixels[0], 155);
        assert_eq!(pixels[1], 105);
        assert_eq!(pixels[2], 55);
        assert_eq!(pixels[3], 255); // alpha unchanged
    }

    #[test]
    fn test_invert_black_to_white() {
        let mut pixels = vec![0, 0, 0, 255];
        apply_invert(&mut pixels);
        assert_eq!(pixels[0], 255);
        assert_eq!(pixels[1], 255);
        assert_eq!(pixels[2], 255);
    }

    #[test]
    fn test_invert_white_to_black() {
        let mut pixels = vec![255, 255, 255, 255];
        apply_invert(&mut pixels);
        assert_eq!(pixels[0], 0);
        assert_eq!(pixels[1], 0);
        assert_eq!(pixels[2], 0);
    }

    #[test]
    fn test_invert_double_is_identity() {
        let original = vec![42, 137, 200, 128];
        let mut pixels = original.clone();
        apply_invert(&mut pixels);
        apply_invert(&mut pixels);
        assert_eq!(pixels, original);
    }

    #[test]
    fn test_invert_preserves_alpha() {
        let mut pixels = vec![100, 100, 100, 50];
        apply_invert(&mut pixels);
        assert_eq!(pixels[3], 50);
    }

    #[test]
    fn test_invert_multiple_pixels() {
        let mut pixels = vec![
            0, 0, 0, 255,       // black -> white
            255, 255, 255, 255,  // white -> black
            128, 128, 128, 255,  // mid-grey -> mid-grey
        ];
        apply_invert(&mut pixels);
        assert_eq!(&pixels[0..4], &[255, 255, 255, 255]);
        assert_eq!(&pixels[4..8], &[0, 0, 0, 255]);
        assert_eq!(&pixels[8..12], &[127, 127, 127, 255]);
    }
}
