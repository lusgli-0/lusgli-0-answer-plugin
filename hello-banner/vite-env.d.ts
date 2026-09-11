/// <reference types="vite/client" />

declare module '*.yaml' {
  const value: {
    slug_name: string;
    type: string;
    version?: string;
    author?: string;
    link?: string;
  };
  export default value;
}

declare module '*.css';
declare module '*.css?inline' {
  const css: string;
  export default css;
}
