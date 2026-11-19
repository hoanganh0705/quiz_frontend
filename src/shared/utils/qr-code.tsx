"use client";

import * as React from "react";
import { cn } from "@/shared/utils/merge-class-names";

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(() => {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x]! + GF256_LOG[y]!];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j]!, GF256_EXP[i]!);
      next[j + 1] ^= poly[j]!;
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, numEcBytes: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (const byte of data) {
    const factor = byte ^ remainder[0]!;
    remainder.copyWithin(0, 1);
    remainder[numEcBytes - 1] = 0;
    for (let i = 0; i < numEcBytes; i++) {
      remainder[i] ^= gfMul(gen[i]!, factor);
    }
  }
  return remainder;
}

interface QrVersionInfo {
  version: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
  alignments: number[];
}

const QR_VERSIONS: QrVersionInfo[] = [
  {
    version: 1,
    totalCodewords: 26,
    ecCodewordsPerBlock: 10,
    numBlocks: 1,
    alignments: [],
  },
  {
    version: 2,
    totalCodewords: 44,
    ecCodewordsPerBlock: 16,
    numBlocks: 1,
    alignments: [6, 18],
  },
  {
    version: 3,
    totalCodewords: 70,
    ecCodewordsPerBlock: 26,
    numBlocks: 1,
    alignments: [6, 22],
  },
  {
    version: 4,
    totalCodewords: 100,
    ecCodewordsPerBlock: 18,
    numBlocks: 2,
    alignments: [6, 26],
  },
  {
    version: 5,
    totalCodewords: 134,
    ecCodewordsPerBlock: 24,
    numBlocks: 2,
    alignments: [6, 30],
  },
  {
    version: 6,
    totalCodewords: 172,
    ecCodewordsPerBlock: 16,
    numBlocks: 4,
    alignments: [6, 34],
  },
  {
    version: 7,
    totalCodewords: 196,
    ecCodewordsPerBlock: 18,
    numBlocks: 4,
    alignments: [6, 22, 38],
  },
  {
    version: 8,
    totalCodewords: 242,
    ecCodewordsPerBlock: 22,
    numBlocks: 4,
    alignments: [6, 24, 42],
  },
  {
    version: 9,
    totalCodewords: 292,
    ecCodewordsPerBlock: 22,
    numBlocks: 5,
    alignments: [6, 26, 46],
  },
  {
    version: 10,
    totalCodewords: 346,
    ecCodewordsPerBlock: 26,
    numBlocks: 5,
    alignments: [6, 28, 50],
  },
];

export function createQrMatrix(text: string): {
  size: number;
  modules: boolean[][];
} {
  const textBytes = new TextEncoder().encode(text);

  let chosenVersion: QrVersionInfo | null = null;
  for (const v of QR_VERSIONS) {
    const dataCapacity = v.totalCodewords - v.ecCodewordsPerBlock * v.numBlocks;
    const headerBits = 4 + (v.version <= 9 ? 8 : 16);
    const requiredBytes = Math.ceil(
      (headerBits + textBytes.length * 8 + 4) / 8,
    );
    if (requiredBytes <= dataCapacity) {
      chosenVersion = v;
      break;
    }
  }

  if (!chosenVersion) {
    chosenVersion = QR_VERSIONS[QR_VERSIONS.length - 1]!;
  }

  const {
    version,
    totalCodewords,
    ecCodewordsPerBlock,
    numBlocks,
    alignments,
  } = chosenVersion;
  const size = 17 + version * 4;
  const dataCodewordsCount = totalCodewords - ecCodewordsPerBlock * numBlocks;

  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  }

  pushBits(0b0100, 4);
  pushBits(textBytes.length, version <= 9 ? 8 : 16);
  for (const b of textBytes) {
    pushBits(b, 8);
  }
  const remainingDataBits = dataCodewordsCount * 8 - bits.length;
  pushBits(0, Math.min(4, Math.max(0, remainingDataBits)));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataCodewordsCount * 8) {
    pushBits(padPatterns[padIdx % 2]!, 8);
    padIdx++;
  }

  const dataCodewords = new Uint8Array(dataCodewordsCount);
  for (let i = 0; i < dataCodewordsCount; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b]!;
    }
    dataCodewords[i] = byteVal;
  }

  const blockSize = Math.floor(dataCodewordsCount / numBlocks);
  const extraBlocks = dataCodewordsCount % numBlocks;
  const blocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const curBlockLen = blockSize + (b >= numBlocks - extraBlocks ? 1 : 0);
    const blockData = dataCodewords.slice(offset, offset + curBlockLen);
    offset += curBlockLen;
    blocks.push(blockData);
    ecBlocks.push(rsComputeRemainder(blockData, ecCodewordsPerBlock));
  }

  const finalCodewords: number[] = [];
  const maxBlockLen = blockSize + (extraBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < blocks[b]!.length) {
        finalCodewords.push(blocks[b]![i]!);
      }
    }
  }
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCodewords.push(ecBlocks[b]![i]!);
    }
  }

  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false),
  );

  function setModule(r: number, c: number, val: boolean, isFn = true) {
    modules[r]![c] = val;
    if (isFn) isFunction[r]![c] = true;
  }

  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          const isBlack =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(mr, mc, isBlack);
        }
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (const r of alignments) {
    for (const c of alignments) {
      if (isFunction[r]![c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBlack = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setModule(r + dr, c + dc, isBlack);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6]![i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i]![6]) setModule(i, 6, i % 2 === 0);
  }

  setModule(4 * version + 9, 8, true);

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8]![i]) setModule(8, i, false, true);
    if (!isFunction[i]![8]) setModule(i, 8, false, true);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8]![size - 1 - i]) setModule(8, size - 1 - i, false, true);
    if (!isFunction[size - 1 - i]![8]) setModule(size - 1 - i, 8, false, true);
  }

  let bitIndex = 0;
  const allBits: number[] = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >>> i) & 1);
    }
  }

  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let c = right; c >= right - 1; c--) {
        if (!isFunction[r]![c]) {
          const bit =
            bitIndex < allBits.length ? allBits[bitIndex]! === 1 : false;
          modules[r]![c] = bit;
          bitIndex++;
        }
      }
    }
    upward = !upward;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r]![c] && (r + c) % 2 === 0) {
        modules[r]![c] = !modules[r]![c];
      }
    }
  }

  const formatBits = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> (14 - i)) & 1) === 1;
    if (i < 6) {
      modules[8]![i] = bit;
    } else if (i === 6) {
      modules[8]![7] = bit;
    } else if (i === 7) {
      modules[8]![8] = bit;
    } else if (i === 8) {
      modules[7]![8] = bit;
    } else {
      modules[14 - i]![8] = bit;
    }

    if (i < 8) {
      modules[size - 1 - i]![8] = bit;
    } else {
      modules[8]![size - 15 + i] = bit;
    }
  }

  return { size, modules };
}

export function qrMatrixToSvgPath(modules: boolean[][]): string {
  const size = modules.length;
  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r]![c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return path;
}

export interface QrCodeSvgProps extends React.SVGProps<SVGSVGElement> {
  value: string;
  size?: number;
  quietZone?: number;
  className?: string;
}

export function QrCodeSvg({
  value,
  size = 180,
  quietZone = 3,
  className,
  ...rest
}: QrCodeSvgProps) {
  const { qrSize, svgPath } = React.useMemo(() => {
    try {
      const { size: matrixSize, modules } = createQrMatrix(value);
      return {
        qrSize: matrixSize,
        svgPath: qrMatrixToSvgPath(modules),
      };
    } catch {
      return { qrSize: 21, svgPath: "" };
    }
  }, [value]);

  const totalViewSize = qrSize + quietZone * 2;

  return (
    <svg
      viewBox={`${-quietZone} ${-quietZone} ${totalViewSize} ${totalViewSize}`}
      width={size}
      height={size}
      className={cn("rounded-lg overflow-hidden bg-white shadow-xs", className)}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${value}`}
      {...rest}
    >
      <rect
        x={-quietZone}
        y={-quietZone}
        width={totalViewSize}
        height={totalViewSize}
        fill="#ffffff"
      />
      <path d={svgPath} fill="#09090b" />
    </svg>
  );
}
