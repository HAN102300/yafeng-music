import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '*.tsbuildinfo',
    ],
  },
  {
    // vendored 第三方组件（React Bits / Aceternity），保留原厂写法
    files: ['components/ui/reactbits/**', 'components/ui/aceternity/**'],
    rules: {
      'prefer-const': 'off',
    },
  },
];

export default eslintConfig;