'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { ExportColumn } from '@/lib/export';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
}

export function ExportButton({ data, columns, filename, title }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(true);
    try {
      const { exportToCSV, exportToExcel, exportToPDF } = await import('@/lib/export');

      switch (format) {
        case 'csv':
          await exportToCSV(data, columns, filename);
          break;
        case 'xlsx':
          await exportToExcel(data, columns, filename);
          break;
        case 'pdf':
          await exportToPDF(data, columns, filename, title);
          break;
      }
      toast.success(`Export ${format.toUpperCase()} réussi`);
    } catch (error) {
      toast.error(`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setExporting(false);
    }
  };

  if (!data.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" />
          {exporting ? 'Export...' : 'Exporter'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
