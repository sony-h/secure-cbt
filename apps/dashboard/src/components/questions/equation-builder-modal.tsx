'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MathRenderer } from '@/components/ui/math-renderer';
import { Copy, Trash2, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface EquationBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (formula: string, isBlock: boolean) => void;
  initialValue?: string;
}

interface SymbolItem {
  label: string;
  latex: string;
  category: string;
  tooltip?: string;
}

const FORMULA_CATEGORIES = {
  basic: [
    { label: 'Pecahan', latex: '\\frac{a}{b}', category: 'basic' },
    { label: 'Pangkat 2', latex: 'x^2', category: 'basic' },
    { label: 'Pangkat n', latex: 'x^{n}', category: 'basic' },
    { label: 'Akar Kuadrat', latex: '\\sqrt{x}', category: 'basic' },
    { label: 'Akar Derajat n', latex: '\\sqrt[n]{x}', category: 'basic' },
    { label: 'Subscript Indeks', latex: 'x_{1}', category: 'basic' },
    { label: 'Subscript & Superscript', latex: 'x_{i}^{2}', category: 'basic' },
    { label: 'Plus Minus', latex: '\\pm', category: 'basic' },
    { label: 'Kali (x)', latex: '\\times', category: 'basic' },
    { label: 'Bagi (÷)', latex: '\\div', category: 'basic' },
    { label: 'Tidak Sama Dengan (≠)', latex: '\\neq', category: 'basic' },
    { label: 'Lebih Kecil Sama Dengan (≤)', latex: '\\le', category: 'basic' },
    { label: 'Lebih Besar Sama Dengan (≥)', latex: '\\ge', category: 'basic' },
    { label: 'Mendekati (≈)', latex: '\\approx', category: 'basic' },
  ],
  calculus: [
    { label: 'Integral Tertentu', latex: '\\int_{a}^{b} f(x) \\, dx', category: 'calculus' },
    { label: 'Integral Tak Tentu', latex: '\\int f(x) \\, dx', category: 'calculus' },
    { label: 'Sigma / Penjumlahan', latex: '\\sum_{i=1}^{n} x_i', category: 'calculus' },
    { label: 'Produk Perkalian', latex: '\\prod_{i=1}^{n} x_i', category: 'calculus' },
    { label: 'Limit', latex: '\\lim_{x \\to 0} f(x)', category: 'calculus' },
    { label: 'Turunan (dy/dx)', latex: '\\frac{dy}{dx}', category: 'calculus' },
    { label: 'Turunan Parsial', latex: '\\frac{\\partial y}{\\partial x}', category: 'calculus' },
    { label: 'Vektor', latex: '\\vec{v}', category: 'calculus' },
    { label: 'Matriks 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', category: 'calculus' },
    { label: 'Matriks 3x3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', category: 'calculus' },
    { label: 'Determinan 2x2', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', category: 'calculus' },
    { label: 'Tak Hingga (∞)', latex: '\\infty', category: 'calculus' },
  ],
  trig: [
    { label: 'Sinus', latex: '\\sin(\\theta)', category: 'trig' },
    { label: 'Cosinus', latex: '\\cos(\\theta)', category: 'trig' },
    { label: 'Tangen', latex: '\\tan(\\theta)', category: 'trig' },
    { label: 'Sudut Theta (θ)', latex: '\\theta', category: 'trig' },
    { label: 'Sudut Alpha (α)', latex: '\\alpha', category: 'trig' },
    { label: 'Sudut Beta (β)', latex: '\\beta', category: 'trig' },
    { label: 'Pi (π)', latex: '\\pi', category: 'trig' },
    { label: 'Derajat (°)', latex: '90^\\circ', category: 'trig' },
    { label: 'Simbol Sudut (∠)', latex: '\\angle ABC', category: 'trig' },
    { label: 'Logaritma Basis 10', latex: '\\log(x)', category: 'trig' },
    { label: 'Logaritma Natural (ln)', latex: '\\ln(x)', category: 'trig' },
    { label: 'Logaritma Basis a', latex: '\\log_{a}(b)', category: 'trig' },
  ],
  science: [
    { label: 'Panah Reaksi (→)', latex: '\\rightarrow', category: 'science' },
    { label: 'Reaksi Bolak-balik (⇌)', latex: '\\rightleftharpoons', category: 'science' },
    { label: 'Gas / Menguap (↑)', latex: '\\uparrow', category: 'science' },
    { label: 'Endapan (↓)', latex: '\\downarrow', category: 'science' },
    { label: 'Delta / Perubahan (Δ)', latex: '\\Delta', category: 'science' },
    { label: 'Panjang Gelombang (λ)', latex: '\\lambda', category: 'science' },
    { label: 'Mikro (μ)', latex: '\\mu', category: 'science' },
    { label: 'Ohm (Ω)', latex: '\\Omega', category: 'science' },
    { label: 'Massa Jenis (ρ)', latex: '\\rho', category: 'science' },
    { label: 'Omega (ω)', latex: '\\omega', category: 'science' },
    { label: 'Sigma Kecil (σ)', latex: '\\sigma', category: 'science' },
    { label: 'Subscript Senyawa (H₂O)', latex: '\\text{H}_2\\text{O}', category: 'science' },
    { label: 'Ion Positif (Ca²⁺)', latex: '\\text{Ca}^{2+}', category: 'science' },
    { label: 'Ion Negatif (SO₄²⁻)', latex: '\\text{SO}_4^{2-}', category: 'science' },
  ],
};

export function EquationBuilderModal({
  open,
  onClose,
  onInsert,
  initialValue = '',
}: EquationBuilderModalProps) {
  const [latex, setLatex] = useState(initialValue);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (open) {
      setLatex(initialValue);
    }
  }, [open, initialValue]);

  const handleAppendSymbol = (symbolLatex: string) => {
    setLatex((prev) => (prev ? `${prev} ${symbolLatex}` : symbolLatex));
  };

  const handleClear = () => {
    setLatex('');
  };

  const handleInsertInline = () => {
    if (!latex.trim()) {
      toast.error('Masukkan rumus terlebih dahulu');
      return;
    }
    onInsert(`$${latex.trim()}$`, false);
    onClose();
  };

  const handleInsertBlock = () => {
    if (!latex.trim()) {
      toast.error('Masukkan rumus terlebih dahulu');
      return;
    }
    onInsert(`$$${latex.trim()}$$`, true);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pembuat Rumus Matematika & Sains (Visual Equation Builder)"
      maxWidth="sm:max-w-3xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!latex}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" />
            Bersihkan
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button variant="secondary" onClick={handleInsertInline} disabled={!latex.trim()}>
              Sisipkan Inline ($)
            </Button>
            <Button onClick={handleInsertBlock} disabled={!latex.trim()}>
              Sisipkan Blok ($$)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Visual Live Formula Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pratinjau Rumus Visual
            </Label>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Render KaTeX Otomatis
            </span>
          </div>
          <div className="min-h-[90px] p-4 rounded-xl border-2 border-primary/20 bg-muted/30 flex items-center justify-center overflow-x-auto text-center shadow-inner">
            {latex.trim() ? (
              <MathRenderer content={`$$${latex}$$`} className="text-lg text-primary font-medium" />
            ) : (
              <span className="text-sm text-muted-foreground/60 italic">
                Klik tombol simbol di bawah atau ketik LaTeX untuk melihat pratinjau rumus di sini...
              </span>
            )}
          </div>
        </div>

        {/* Raw LaTeX input for fine-tuning */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Kode LaTeX (Dapat diedit langsung)
          </Label>
          <Input
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="Contoh: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
            className="font-mono text-sm"
          />
        </div>

        {/* Tabbed Formula Palette */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="basic" className="text-xs py-2">
              Aritmatika & Dasar
            </TabsTrigger>
            <TabsTrigger value="calculus" className="text-xs py-2">
              Aljabar & Kalkulus
            </TabsTrigger>
            <TabsTrigger value="trig" className="text-xs py-2">
              Trigonometri & Log
            </TabsTrigger>
            <TabsTrigger value="science" className="text-xs py-2">
              Sains & Kimia
            </TabsTrigger>
          </TabsList>

          {Object.entries(FORMULA_CATEGORIES).map(([catKey, items]) => (
            <TabsContent key={catKey} value={catKey} className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAppendSymbol(item.latex)}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-center group active:scale-[0.97] shadow-sm min-h-[64px]"
                    title={item.label}
                  >
                    <div className="h-7 flex items-center justify-center pointer-events-none">
                      <MathRenderer content={`$${item.latex}$`} className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Modal>
  );
}
