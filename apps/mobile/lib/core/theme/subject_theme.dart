import 'package:flutter/material.dart';

class SubjectThemeData {
  final Color primary;
  final Color gradientStart;
  final Color gradientEnd;
  final Color backgroundWash;
  final Color border;
  final IconData icon;
  final String category;

  const SubjectThemeData({
    required this.primary,
    required this.gradientStart,
    required this.gradientEnd,
    required this.backgroundWash,
    required this.border,
    required this.icon,
    required this.category,
  });
}

class SubjectTheme {
  // Matematika & Eksakta
  static const math = SubjectThemeData(
    primary: Color(0xFF7C3AED),       // Royal Violet
    gradientStart: Color(0xFF8B5CF6),
    gradientEnd: Color(0xFF6D28D9),
    backgroundWash: Color(0xFFF5F3FF),
    border: Color(0xFFDDD6FE),
    icon: Icons.calculate_rounded,
    category: 'Matematika & Eksakta',
  );

  // Fisika & Kimia
  static const physics = SubjectThemeData(
    primary: Color(0xFF0284C7),       // Electric Cyan
    gradientStart: Color(0xFF38BDF8),
    gradientEnd: Color(0xFF0369A1),
    backgroundWash: Color(0xFFF0F9FF),
    border: Color(0xFFBAE6FD),
    icon: Icons.science_rounded,
    category: 'Sains & Fisika',
  );

  // Biologi & Ilmu Alam
  static const biology = SubjectThemeData(
    primary: Color(0xFF059669),       // Forest Emerald
    gradientStart: Color(0xFF34D399),
    gradientEnd: Color(0xFF047857),
    backgroundWash: Color(0xFFECFDF5),
    border: Color(0xFFA7F3D0),
    icon: Icons.eco_rounded,
    category: 'Biologi & Alam',
  );

  // Bahasa & Sastra
  static const language = SubjectThemeData(
    primary: Color(0xFFEA580C),       // Sunset Tangerine
    gradientStart: Color(0xFFFB923C),
    gradientEnd: Color(0xFFC2410C),
    backgroundWash: Color(0xFFFFF7ED),
    border: Color(0xFFFED7AA),
    icon: Icons.menu_book_rounded,
    category: 'Bahasa & Sastra',
  );

  // Ekonomi & Sosial
  static const social = SubjectThemeData(
    primary: Color(0xFFE11D48),       // Crimson Rose
    gradientStart: Color(0xFFFB7185),
    gradientEnd: Color(0xFFBE123C),
    backgroundWash: Color(0xFFFFF1F2),
    border: Color(0xFFFECDD3),
    icon: Icons.pie_chart_rounded,
    category: 'Sosial & Ekonomi',
  );

  // Default / Pelajaran Umum
  static const generic = SubjectThemeData(
    primary: Color(0xFF4F46E5),       // Electric Indigo
    gradientStart: Color(0xFF6366F1),
    gradientEnd: Color(0xFF4338CA),
    backgroundWash: Color(0xFFEEF2FF),
    border: Color(0xFFC7D2FE),
    icon: Icons.school_rounded,
    category: 'Pelajaran Umum',
  );

  /// Resolves theme dynamically based on subject name or subject code.
  static SubjectThemeData fromSubject({String? name, String? code}) {
    final query = '${name ?? ''} ${code ?? ''}'.toUpperCase();

    if (query.contains('MTK') || query.contains('MATEMATIKA') || query.contains('MATH')) {
      return math;
    }
    if (query.contains('FIS') || query.contains('KIM') || query.contains('FISIKA') || query.contains('KIMIA')) {
      return physics;
    }
    if (query.contains('BIO') || query.contains('BIOLOGI') || query.contains('IPA')) {
      return biology;
    }
    if (query.contains('BIN') || query.contains('BING') || query.contains('BJE') ||
        query.contains('BAHASA') || query.contains('INDONESIA') || query.contains('INGGRIS') || query.contains('JEPANG')) {
      return language;
    }
    if (query.contains('EKO') || query.contains('GEO') || query.contains('SOS') ||
        query.contains('EKONOMI') || query.contains('GEOGRAFI') || query.contains('SOSIOLOGI') ||
        query.contains('SEJ') || query.contains('SEJARAH') || query.contains('PKN') || query.contains('IPS')) {
      return social;
    }

    return generic;
  }
}
