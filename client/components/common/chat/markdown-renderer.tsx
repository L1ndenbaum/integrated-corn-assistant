"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props
            const match = /language-(\w+)/.exec(className || "")
            const isInline = !match

            if (isInline) {
              return (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>
                  {children}
                </code>
              )
            }

            return (
              <div className="my-4">
                <SyntaxHighlighter
                  style={oneLight}
                  language={match[1]}
                  PreTag="div"
                  className="!bg-gray-50 !border !border-gray-200 !rounded-lg !text-sm"
                  showLineNumbers={false}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            )
          },
          pre(props) {
            const { children, node, ...rest } = props
            return (
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto" {...rest}>
                {children}
              </pre>
            )
          },
          h1(props) {
            const { node, ...rest } = props
            return <h1 className="text-xl font-bold mb-3 mt-6 first:mt-0 text-gray-900" {...rest} />
          },
          h2(props) {
            const { node, ...rest } = props
            return <h2 className="text-lg font-semibold mb-2 mt-5 first:mt-0 text-gray-900" {...rest} />
          },
          h3(props) {
            const { node, ...rest } = props
            return <h3 className="text-base font-medium mb-2 mt-4 first:mt-0 text-gray-900" {...rest} />
          },
          h4(props) {
            const { node, ...rest } = props
            return <h4 className="text-sm font-medium mb-1 mt-3 first:mt-0 text-gray-900" {...rest} />
          },
          p(props) {
            const { node, ...rest } = props
            return <p className="mb-3 last:mb-0 text-gray-700 leading-relaxed" {...rest} />
          },
          ul(props) {
            const { node, ...rest } = props
            return <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700" {...rest} />
          },
          ol(props) {
            const { node, ...rest } = props
            return <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700" {...rest} />
          },
          li(props) {
            const { node, ...rest } = props
            return <li className="leading-relaxed" {...rest} />
          },
          blockquote(props) {
            const { node, ...rest } = props
            return (
              <blockquote
                className="border-l-4 border-blue-200 pl-4 py-2 my-4 bg-blue-50/50 italic text-gray-600 rounded-r-md"
                {...rest}
              />
            )
          },
          table(props) {
            const { node, ...rest } = props
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200" {...rest} />
              </div>
            )
          },
          thead(props) {
            const { node, ...rest } = props
            return <thead className="bg-gray-50" {...rest} />
          },
          tbody(props) {
            const { node, ...rest } = props
            return <tbody className="bg-white divide-y divide-gray-200" {...rest} />
          },
          tr(props) {
            const { node, ...rest } = props
            return <tr className="hover:bg-gray-50" {...rest} />
          },
          th(props) {
            const { node, ...rest } = props
            return (
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                {...rest}
              />
            )
          },
          td(props) {
            const { node, ...rest } = props
            return <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap" {...rest} />
          },
          a(props) {
            const { node, ...rest } = props
            return (
              <a
                className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-400 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                {...rest}
              />
            )
          },
          strong(props) {
            const { node, ...rest } = props
            return <strong className="font-semibold text-gray-900" {...rest} />
          },
          em(props) {
            const { node, ...rest } = props
            return <em className="italic text-gray-700" {...rest} />
          },
          hr(props) {
            const { node, ...rest } = props
            return <hr className="my-6 border-gray-200" {...rest} />
          },
          img(props) {
            const { node, ...rest } = props
            return <img className="max-w-full h-auto rounded-lg shadow-sm border border-gray-200 my-4" {...rest} />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
