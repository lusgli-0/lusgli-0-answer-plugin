/*
 * 本文件：补 Vite 对 yaml / ?raw 资源的类型，tsc 才不会把 import info.yaml 判成 any/报错。
 * 何时加载：只给编译器用，运行时不进包。
 */
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

declare module '*?raw' {
  const content: string;
  export default content;
}
