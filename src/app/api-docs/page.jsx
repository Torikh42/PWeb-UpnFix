"use client";

import dynamic from "next/dynamic";
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  return (
    <section className="container mx-auto p-4 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">API Documentation</h1>
      <SwaggerUI url="/api/swagger" />
    </section>
  );
}
