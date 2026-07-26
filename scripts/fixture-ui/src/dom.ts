/** フレームワークなしで組むための最小の DOM ヘルパ。 */

type Child = Node | string | null | undefined | false;

interface Attrs {
  class?: string;
  text?: string;
  html?: never;
  [key: string]: unknown;
}

/**
 * 要素を作る。`on<Event>` は addEventListener、それ以外は属性。
 * `text` はテキスト子ノードのショートハンド (常に textContent 経由なので
 * fixture 由来の文字列が HTML として解釈されることはない)。
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "text") node.textContent = String(value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value as EventListener);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  node.append(...children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false));
  return node;
}

export function clear(node: Element): void {
  node.replaceChildren();
}

/** el() と同じ Child 規則で追加する (生の append と違い null を "null" にしない)。 */
export function append(parent: Element, ...children: Child[]): void {
  parent.append(
    ...children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false),
  );
}
