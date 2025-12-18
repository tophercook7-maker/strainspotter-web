/**
 * Admin Control Panel
 * Main entry point for admin tools
 */

import { requireAdmin } from '@/lib/adminAuth';
import Link from 'next/link';

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Control Panel</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/admin/dataset"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Dataset Dashboard</h2>
          <p className="text-gray-600">
            Manage strain datasets, trigger scraping, generation, processing, and manifest building
          </p>
        </Link>

        <Link
          href="/admin/model"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Model Tuner</h2>
          <p className="text-gray-600">
            Adjust matcher weights, test models, and compare v1 vs v2 results
          </p>
        </Link>

        <Link
          href="/admin/vault"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Vault Explorer</h2>
          <p className="text-gray-600">
            Browse vault contents, manage files, and view dataset structure
          </p>
        </Link>

        <Link
          href="/admin/vault/scraper"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Scraper Control</h2>
          <p className="text-gray-600">
            Manage scraper jobs, view queue, and configure scraping settings
          </p>
        </Link>

        <Link
          href="/admin/vault/generator"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Generator Control</h2>
          <p className="text-gray-600">
            Trigger synthetic image generation and manage generation jobs
          </p>
        </Link>

        <Link
          href="/admin/clusters"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
        >
          <h2 className="text-xl font-semibold mb-2">Phenotype Clusters</h2>
          <p className="text-gray-600">
            View and manage phenotype clusters for strains
          </p>
        </Link>
      </div>
    </div>
  );
}
