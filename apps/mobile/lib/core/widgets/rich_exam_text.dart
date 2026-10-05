import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

/// Renders question and option text with support for LaTeX mathematical formulas
/// using $...$ for inline math and $$...$$ for centered block math equations.
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

    // Check if the text contains any math formula delimiters
    if (!text.contains(r'$')) {
      return Text(
        text,
        style: style,
        textAlign: textAlign,
      );
    }

    final defaultStyle = style ?? DefaultTextStyle.of(context).style;
    final effectiveMathColor = mathColor ?? defaultStyle.color ?? Colors.black87;

    // Split block math ($$...$$) first
    final blockRegex = RegExp(r'\$\$([\s\S]*?)\$\$');
    final blockMatches = blockRegex.allMatches(text);

    if (blockMatches.isEmpty) {
      // Inline math only
      return _buildInlineFlow(text, defaultStyle, effectiveMathColor);
    }

    final widgets = <Widget>[];
    var lastIndex = 0;

    for (final match in blockMatches) {
      if (match.start > lastIndex) {
        final textBefore = text.substring(lastIndex, match.start);
        widgets.add(_buildInlineFlow(textBefore, defaultStyle, effectiveMathColor));
      }

      final formula = match.group(1)?.trim() ?? '';
      widgets.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Center(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: _buildMathWidget(
                formula,
                defaultStyle.copyWith(color: effectiveMathColor, fontSize: (defaultStyle.fontSize ?? 14) * 1.1),
                isBlock: true,
              ),
            ),
          ),
        ),
      );

      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      widgets.add(_buildInlineFlow(text.substring(lastIndex), defaultStyle, effectiveMathColor));
    }

    return Column(
      crossAxisAlignment: textAlign == TextAlign.center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: widgets,
    );
  }

  Widget _buildInlineFlow(String chunk, TextStyle defaultStyle, Color mathColor) {
    final inlineRegex = RegExp(r'\$([^\$\n]+?)\$');
    final matches = inlineRegex.allMatches(chunk);

    if (matches.isEmpty) {
      return Text(chunk, style: defaultStyle, textAlign: textAlign);
    }

    final spans = <InlineSpan>[];
    var lastIndex = 0;

    for (final match in matches) {
      if (match.start > lastIndex) {
        spans.add(TextSpan(text: chunk.substring(lastIndex, match.start), style: defaultStyle));
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
      spans.add(TextSpan(text: chunk.substring(lastIndex), style: defaultStyle));
    }

    return Text.rich(
      TextSpan(children: spans),
      textAlign: textAlign,
    );
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
        style: mathStyle,
      );
    }
  }
}
