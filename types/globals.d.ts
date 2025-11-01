// types/globals.d.ts
import type * as React from 'react';

/**
 * Re-export React 19's JSX types under the global `JSX` namespace.
 * This is a temporary patch to support libraries (like react-markdown)
 * that haven't yet been updated to stop expecting this global.
 */
declare global {
  namespace JSX {
    type IntrinsicElements = React.JSX.IntrinsicElements;
    type Element = React.JSX.Element;
    type ElementType = React.JSX.ElementType;
  }
}