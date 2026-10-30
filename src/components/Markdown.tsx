"use client";

import type { ElementType } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

type MdProps = { node?: unknown; className?: string };

// react-markdown passes the hast `node` to every override; strip it so it
// doesn't leak onto the DOM element.
function withoutNode<P extends MdProps>(props: P) {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

function styled(Tag: ElementType, className: string) {
  return function Styled(props: MdProps) {
    return <Tag {...withoutNode(props)} className={className} />;
  };
}

const heading = "font-semibold text-ink [&:not(:last-child)]:mb-1";
const block = "[&:not(:last-child)]:mb-2";

const components: Components = {
  a: (props: MdProps) => (
    <a
      {...withoutNode(props)}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-link underline underline-offset-2 hover:text-link/80"
    />
  ),
  p: styled("p", block),
  strong: styled("strong", "font-semibold text-ink"),
  ul: styled("ul", `list-disc pl-5 ${block}`),
  ol: styled("ol", `list-decimal pl-5 ${block}`),
  li: styled("li", "[&>input]:mr-1.5"),
  blockquote: styled("blockquote", `border-l-2 border-hairline pl-3 italic ${block}`),
  h1: styled("h4", `text-base font-bold text-ink [&:not(:last-child)]:mb-1`),
  h2: styled("h4", `text-base font-bold text-ink [&:not(:last-child)]:mb-1`),
  h3: styled("h5", heading),
  h4: styled("h5", heading),
  h5: styled("h5", heading),
  h6: styled("h5", heading),
  code: styled("code", "rounded bg-canvas px-1 py-0.5 font-mono text-[0.85em] text-ink"),
  pre: styled(
    "pre",
    `overflow-x-auto rounded-lg bg-canvas p-3 text-xs ${block} [&_code]:bg-transparent [&_code]:p-0`,
  ),
  hr: styled("hr", "my-2 border-hairline"),
  table: (props: MdProps) => (
    <div className={`overflow-x-auto ${block}`}>
      <table {...withoutNode(props)} className="border-collapse text-xs" />
    </div>
  ),
  th: styled("th", "border border-hairline px-2 py-1 text-left font-semibold text-ink"),
  td: styled("td", "border border-hairline px-2 py-1"),
};

// 이미지는 외부 주소 호출/레이아웃 깨짐을 막기 위해 렌더하지 않고 대체 텍스트만 남깁니다.
// react-markdown은 원본 HTML을 렌더하지 않고 javascript: 같은 위험한 URL도 걸러냅니다.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
        disallowedElements={["img"]}
        unwrapDisallowed
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
