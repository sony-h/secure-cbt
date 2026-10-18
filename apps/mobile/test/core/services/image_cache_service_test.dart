import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/services/image_cache_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late ImageCacheService service;

  setUp(() {
    service = ImageCacheService();
  });

  group('ImageCacheService - extractExamImageUrls', () {
    test('extracts direct question image_url and option image_url', () {
      final questions = [
        {
          'id': 'q1',
          'image_url': '/uploads/img1.png',
          'options': [
            {'id': 'opt1', 'image_url': '/uploads/opt1.png'},
            {'id': 'opt2', 'image_url': null},
          ],
        },
        {
          'id': 'q2',
          'question': {
            'image_url': '/uploads/img2.jpg',
            'options': [
              {'id': 'opt3', 'image_url': '/uploads/opt3.png'},
            ],
          },
        },
      ];

      final urls = service.extractExamImageUrls(questions);

      expect(urls, containsAll([
        '/uploads/img1.png',
        '/uploads/opt1.png',
        '/uploads/img2.jpg',
        '/uploads/opt3.png',
      ]));
      expect(urls.length, 4);
    });

    test('extracts markdown embedded images from question content', () {
      final questions = [
        {
          'id': 'q1',
          'content': 'Perhatikan gambar berikut: ![diagram](/uploads/diagram.png) berapakah nilainya?',
          'options': [],
        },
      ];

      final urls = service.extractExamImageUrls(questions);

      expect(urls, contains('/uploads/diagram.png'));
    });

    test('deduplicates repeating image URLs and ignores empty strings', () {
      final questions = [
        {
          'id': 'q1',
          'image_url': '/uploads/same.png',
          'options': [
            {'image_url': '/uploads/same.png'},
            {'image_url': '   '},
          ],
        },
      ];

      final urls = service.extractExamImageUrls(questions);

      expect(urls.length, 1);
      expect(urls.first, '/uploads/same.png');
    });
  });
}
