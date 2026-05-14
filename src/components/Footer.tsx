export function Footer() {
  return (
    <footer className="bg-slate-950 px-4 py-8 text-center text-sm text-slate-400">
      <p className="mb-3">
        有问题或建议？联系我们：
        <a
          href="mailto:feedback@ai.prx2025.xyz"
          className="text-rose-300 transition-colors hover:text-rose-200"
        >
          feedback@ai.prx2025.xyz
        </a>
        （或直接联系开发者
        <a
          href="mailto:panrenx.global@gmail.com"
          className="text-rose-300 transition-colors hover:text-rose-200"
        >
          panrenx.global@gmail.com
        </a>
        ）
      </p>
      <a
        href="https://discord.gg/Z245qNya4"
        target="_blank"
        rel="noopener noreferrer"
        className="text-rose-300 transition-colors hover:text-rose-200"
      >
        Join our Discord Community
      </a>
    </footer>
  );
}
