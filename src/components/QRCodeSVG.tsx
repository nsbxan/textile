import React, { useMemo } from 'react';
import { generateQRMatrix } from '../utils/qrcode';

interface QRCodeSVGProps {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
  includeMargin?: boolean;
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
  value,
  size = 180,
  className = '',
  fgColor = '#000000',
  bgColor = '#ffffff',
  includeMargin = true,
}) => {
  const matrix = useMemo(() => {
    try {
      const res = generateQRMatrix(value || 'TEXTILE-PRO-MATO');
      if (res && res.length > 0) return res;
    } catch (e) {
      console.error('QR code generation error:', e);
    }
    // Zaxira standart 21x21 QR matritsasi
    return generateFallbackMatrix();
  }, [value]);

  const margin = includeMargin ? 2 : 0;
  const matrixSize = matrix.length;
  const viewBoxSize = matrixSize + margin * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={`shape-rendering-crispEdges ${className}`}
      style={{ 
        shapeRendering: 'crispEdges',
        maxWidth: '100%',
        height: 'auto',
        aspectRatio: '1/1',
        display: 'block'
      }}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c + margin}
              y={r + margin}
              width={1}
              height={1}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
};

// Fallback 21x21 matrix (Finder patterns + data pattern)
function generateFallbackMatrix(): boolean[][] {
  const size = 21;
  const m = Array.from({ length: size }, () => Array(size).fill(false));
  const setFinder = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          m[top + r][left + c] = true;
        }
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // Timing
  for (let i = 8; i < size - 8; i++) {
    if (i % 2 === 0) {
      m[6][i] = true;
      m[i][6] = true;
    }
  }

  // Sample data patterns
  for (let r = 8; r < size; r++) {
    for (let c = 8; c < size; c++) {
      m[r][c] = (r * 3 + c * 7) % 5 === 0 || (r + c) % 3 === 0;
    }
  }
  return m;
}
