import unittest
from io import BytesIO
from PIL import Image
from ocr_service.images import decode_receipt_image

class ImagesTest(unittest.TestCase):
    def test_exif_rotation_is_applied_before_recognition(self):
        image=Image.new("RGB",(12,8),(255,0,0))
        exif=image.getexif(); exif[274]=6
        stream=BytesIO(); image.save(stream,format="JPEG",exif=exif)
        result=decode_receipt_image(stream.getvalue(),1000)
        self.assertEqual(result.shape,(12,8,3))
        self.assertGreater(int(result[0,0,2]),240)
        self.assertLess(int(result[0,0,0]),10)
    def test_pixel_limit_is_checked(self):
        stream=BytesIO(); Image.new("RGB",(12,8)).save(stream,format="PNG")
        with self.assertRaises(ValueError): decode_receipt_image(stream.getvalue(),95)
    def test_invalid_image_rejected(self):
        with self.assertRaises((ValueError,OSError)): decode_receipt_image(b"invalid",1000)
