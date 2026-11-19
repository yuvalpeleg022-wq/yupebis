import { useMemo } from 'react';
import { isWebGLAvailable } from '../utils/webgl';

export function useWebGL() {
  return useMemo(isWebGLAvailable, []);
}
