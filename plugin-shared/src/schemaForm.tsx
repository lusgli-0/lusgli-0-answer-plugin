/**
 * 给 Answer SchemaForm 的 textarea 做增强，不改主站源码。
 *
 * Answer 插件设置页按 ConfigFields 自动画表单，只认识 textarea，
 * 没有「动态增删一组复合字段」的控件。做法：
 *   1. 后台仍用 textarea 存原文（保存、读库走原有通道）
 *   2. 找到 name=调用方传入的 textarea
 *   3. 在它前面插入宿主，把 textarea 藏起来（仍留在 DOM 里给提交用）
 *   4. 改内容时必须用 writeTextarea：直接 el.value = x 在 React 18 里常被忽略，
 *      必须走原型上的 setter，再冒泡一个 input，SchemaForm 的 onChange 才会改 formData
 *
 * 可视化卡片 UI 留在各插件里；本文件只提供写回桥和「找到 textarea 再 portal」。
 * 没有默认 textarea 名字，调用方传入 textareaName。
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * 把字符串写进受控 textarea。
 * 直接 el.value = x 在 React 18 里常被忽略，必须走原型上的 setter，
 * 再冒泡一个 input，SchemaForm 的 onChange 才会改 formData。
 */
export function writeTextarea(el: HTMLTextAreaElement, value: string): void {
  const desc = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  );
  if (desc?.set) {
    desc.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export interface EnhanceTextareaFieldProps {
  textareaName: string;
  children: (textarea: HTMLTextAreaElement) => ReactNode;
  /** 插在 textarea 前面的宿主 class，可选。 */
  hostClassName?: string;
  /** 加到原 textarea 上用来隐藏它的 class，可选；清理时会去掉。 */
  hiddenClassName?: string;
}

/**
 * 挂在插件根上、对前台页面透明。
 * 用 MutationObserver 等 SchemaForm 把 textarea 画出来，再 portal children 进去。
 * 离开设置页时 textarea 消失，observer 会把状态清掉，编辑器自动卸。
 */
export function EnhanceTextareaField({
  textareaName,
  children,
  hostClassName,
  hiddenClassName,
}: EnhanceTextareaFieldProps) {
  const [textarea, setTextarea] = useState<HTMLTextAreaElement | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const find = () =>
      document.querySelector(
        `textarea[name="${textareaName}"]`,
      ) as HTMLTextAreaElement | null;

    const sync = () => {
      const el = find();
      setTextarea((prev) => (prev === el ? prev : el));
    };

    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [textareaName]);

  /**
   * textarea 出现后：插一个宿主节点、把原文本框藏起来（仍留在 DOM 里给提交用）。
   * 清理时还原 class，避免热更新把设置页搞残。
   */
  useEffect(() => {
    if (!textarea || !textarea.parentElement) {
      setHost(null);
      return undefined;
    }
    const mount = document.createElement('div');
    if (hostClassName) mount.className = hostClassName;
    textarea.parentElement.insertBefore(mount, textarea);
    if (hiddenClassName) textarea.classList.add(hiddenClassName);
    setHost(mount);
    return () => {
      if (hiddenClassName) textarea.classList.remove(hiddenClassName);
      mount.remove();
    };
  }, [textarea, hostClassName, hiddenClassName]);

  if (!textarea || !host) return null;
  return createPortal(children(textarea), host);
}
