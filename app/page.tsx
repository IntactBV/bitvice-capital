import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-4xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">BitVice Capital</h1>
          <h4 className="max-w-xs text-xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Fast trading tools platform
          </h4>
          <p className="max-w-md text-md leading-8 text-zinc-600 dark:text-zinc-400">
            A trading tools platform built with Next.js and MySQL delivers a fastfrontend combined with a robust relational backend for secure, structured market and user data. The frontend leverages server‑side rendering, incremental static regeneration and client‑side hydration to deliver low‑latency charts, dashboards and real‑time updates, while API routes and WebSocket integrations feed tick data, order status and trade events. MySQL provides reliable transactional storage for positions, orders, user profiles and audit trails, with optimized schemas, indexed queries and connection pooling for predictable performance. Features include interactive candlestick and depth charts, portfolio analytics, customizable alerts, historical backtesting and execution connectors to brokers and exchanges. Built‑in authentication, role‑based access control, encryption at rest and in transit, and automated backups protect sensitive financial data. The architecture is developer‑friendly and extensible—modular components, Next.js middleware, server actions and a REST/GraphQL API enable rapid feature development and third‑party integrations. Observability, logging and metrics support real‑time monitoring and capacity planning, and the platform is designed for horizontal scaling and CI/CD deployment to cloud environments. Together, Next.js and MySQL offer a pragmatic balance of responsiveness, reliability and maintainability for modern trading workflows. Operational cost efficiency and compliance tooling round out the solution for institutional and retail teams.
          </p>
        </div>
      </main>
    </div>
  );
}
