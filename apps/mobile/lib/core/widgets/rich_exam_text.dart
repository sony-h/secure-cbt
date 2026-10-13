import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

/// Renders question and option text with support for:
/// - Fenced code blocks with language headers & horizontal scroll (```lang ... ```)
/// - LaTeX mathematical formulas ($...$ for inline and $$...$$ for block math)
/// - Rich typography: **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, `inline code`,
///   <sup>superscript</sup>, <sub>subscript</sub>, and line breaks.
class RichExamText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Color? mathColor;
  final TextAlign textAlign;

  const RichExamText({
    super.key,
    required this.text,
    this.style,
    this.mathColor,
    this.textAlign = TextAlign.start,
  });

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    final defaultStyle = style ?? DefaultTextStyle.of(context).style;
    final effectiveMathColor = mathColor ?? defaultStyle.color ?? Colors.black87;

    // Split major blocks first:
    // 1. Fenced Code Blocks (```[lang]\n...\n```)
    // 2. Block math ($$...$$)
    final majorBlockRegex = RegExp(r'(```(?:[a-zA-Z0-9_\-#+]+)?\r?\n[\s\S]*?```|\$\$[\s\S]*?\$\$)');
    final majorMatches = majorBlockRegex.allMatches(text);

    if (majorMatches.isEmpty) {
      return _buildInlineFlow(text, defaultStyle, effectiveMathColor);
    }

    final widgets = <Widget>[];
    var lastIndex = 0;

    for (final match in majorMatches) {
      if (match.start > lastIndex) {
        final textBefore = text.substring(lastIndex, match.start);
        if (textBefore.trim().isNotEmpty) {
          widgets.add(_buildInlineFlow(textBefore, defaultStyle, effectiveMathColor));
        }
      }

      final matchedChunk = match.group(0) ?? '';

      if (matchedChunk.startsWith('```')) {
        // Render Code Block
        final codeRegex = RegExp(r'^```([a-zA-Z0-9_\-#+]*)\r?\n([\s\S]*?)```$');
        final codeMatch = codeRegex.firstMatch(matchedChunk);
        final lang = (codeMatch?.group(1)?.trim().isNotEmpty ?? false)
            ? codeMatch!.group(1)!.trim().toUpperCase()
            : 'CODE';
        final code = codeMatch?.group(2) ?? '';

        widgets.add(_buildCodeBlockWidget(lang, code));
      } else {
        // Render Block Math ($$...$$)
        final formula = matchedChunk.replaceAll(r'$$', '').trim();
        widgets.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Center(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: _buildMathWidget(
                  formula,
                  defaultStyle.copyWith(
                    color: effectiveMathColor,
                    fontSize: (defaultStyle.fontSize ?? 14) * 1.1,
                  ),
                  isBlock: true,
                ),
              ),
            ),
          ),
        );
      }

      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      final textAfter = text.substring(lastIndex);
      if (textAfter.trim().isNotEmpty) {
        widgets.add(_buildInlineFlow(textAfter, defaultStyle, effectiveMathColor));
      }
    }

    return Column(
      crossAxisAlignment: textAlign == TextAlign.center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: widgets,
    );
  }

  Widget _buildCodeBlockWidget(String language, String code) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E2E), // Dark Catppuccin / VS Code style
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF313244)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: const BoxDecoration(
              color: Color(0xFF181825),
              borderRadius: BorderRadius.vertical(top: Radius.circular(9)),
              border: Border(bottom: BorderSide(color: Color(0xFF313244))),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFA6E3A1), // Green dot
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  language,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                    color: Color(0xFFCDD6F4),
                  ),
                ),
              ],
            ),
          ),
          // Code Content (Horizontal Scrollable)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(12),
            child: Text(
              code,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 13,
                height: 1.5,
                color: Color(0xFFF5E0DC),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineFlow(String chunk, TextStyle defaultStyle, Color mathColor) {
    // If no math formulas exist in chunk, parse typography directly
    if (!chunk.contains(r'$')) {
      final spans = _parseTypographySpans(chunk, defaultStyle);
      return Text.rich(
        TextSpan(children: spans),
        textAlign: textAlign,
      );
    }

    final inlineRegex = RegExp(r'\$([^\$\n]+?)\$');
    final matches = inlineRegex.allMatches(chunk);

    if (matches.isEmpty) {
      final spans = _parseTypographySpans(chunk, defaultStyle);
      return Text.rich(TextSpan(children: spans), textAlign: textAlign);
    }

    final spans = <InlineSpan>[];
    var lastIndex = 0;

    for (final match in matches) {
      if (match.start > lastIndex) {
        final textBefore = chunk.substring(lastIndex, match.start);
        spans.addAll(_parseTypographySpans(textBefore, defaultStyle));
      }

      final formula = match.group(1)?.trim() ?? '';
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: _buildMathWidget(
              formula,
              defaultStyle.copyWith(color: mathColor),
              isBlock: false,
            ),
          ),
        ),
      );

      lastIndex = match.end;
    }

    if (lastIndex < chunk.length) {
      final textAfter = chunk.substring(lastIndex);
      spans.addAll(_parseTypographySpans(textAfter, defaultStyle));
    }

    return Text.rich(
      TextSpan(children: spans),
      textAlign: textAlign,
    );
  }

  List<InlineSpan> _parseTypographySpans(String text, TextStyle baseStyle) {
    // Regex for inline styles:
    // `code` | **bold** | *italic* | ~~strike~~ | <u>underline</u> | <sub>sub</sub> | <sup>sup</sup>
    final tokenRegex = RegExp(
      r'(`[^`]+`|\*\*(?!\s)[^*\n]+?(?<!\s)\*\*|\*(?!\s)[^*\n]+?(?<!\s)\*|~~(?!\s)[^~\n]+?(?<!\s)~~|<u>[\s\S]*?<\/u>|<sub>[\s\S]*?<\/sub>|<sup>[\s\S]*?<\/sup>)',
    );
    final matches = tokenRegex.allMatches(text);

    if (matches.isEmpty) {
      return [TextSpan(text: text, style: baseStyle)];
    }

    final spans = <InlineSpan>[];
    var lastIdx = 0;

    for (final m in matches) {
      if (m.start > lastIdx) {
        spans.add(TextSpan(text: text.substring(lastIdx, m.start), style: baseStyle));
      }

      final token = m.group(0) ?? '';

      if (token.startsWith('`') && token.endsWith('`')) {
        // Inline code: use TextSpan with background so it wraps naturally without WidgetSpan overflow
        spans.add(
          TextSpan(
            text: token.substring(1, token.length - 1),
            style: baseStyle.copyWith(
              fontFamily: 'monospace',
              fontSize: (baseStyle.fontSize ?? 14) * 0.9,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF1E3A8A),
              backgroundColor: const Color(0xFFE2E8F0),
            ),
          ),
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        spans.add(
          TextSpan(
            text: token.substring(2, token.length - 2),
            style: baseStyle.copyWith(fontWeight: FontWeight.bold),
          ),
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        spans.add(
          TextSpan(
            text: token.substring(1, token.length - 1),
            style: baseStyle.copyWith(fontStyle: FontStyle.italic),
          ),
        );
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        spans.add(
          TextSpan(
            text: token.substring(2, token.length - 2),
            style: baseStyle.copyWith(decoration: TextDecoration.lineThrough),
          ),
        );
      } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
        spans.add(
          TextSpan(
            text: token.substring(3, token.length - 4),
            style: baseStyle.copyWith(decoration: TextDecoration.underline),
          ),
        );
      } else if (token.startsWith('<sub>') && token.endsWith('</sub>')) {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.bottom,
            child: Transform.translate(
              offset: const Offset(0, 2),
              child: Text(
                token.substring(5, token.length - 6),
                style: baseStyle.copyWith(fontSize: (baseStyle.fontSize ?? 14) * 0.75),
              ),
            ),
          ),
        );
      } else if (token.startsWith('<sup>') && token.endsWith('</sup>')) {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.top,
            child: Transform.translate(
              offset: const Offset(0, -3),
              child: Text(
                token.substring(5, token.length - 6),
                style: baseStyle.copyWith(
                  fontSize: (baseStyle.fontSize ?? 14) * 0.75,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        );
      }

      lastIdx = m.end;
    }

    if (lastIdx < text.length) {
      spans.add(TextSpan(text: text.substring(lastIdx), style: baseStyle));
    }

    return spans;
  }

  Widget _buildMathWidget(String formula, TextStyle mathStyle, {required bool isBlock}) {
    try {
      return Math.tex(
        formula,
        textStyle: mathStyle,
        mathStyle: isBlock ? MathStyle.display : MathStyle.text,
        onErrorFallback: (err) => Text(
          isBlock ? '\$\$$formula\$\$' : '\$$formula\$',
          style: mathStyle.copyWith(color: Colors.red.shade700, fontStyle: FontStyle.italic),
        ),
      );
    } catch (_) {
      return Text(
        isBlock ? '\$\$$formula\$\$' : '\$$formula\$',
        style: mathStyle.copyWith(color: Colors.red.shade700, fontStyle: FontStyle.italic),
      );
    }
  }
}
