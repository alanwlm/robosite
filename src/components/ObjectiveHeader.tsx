import { Info } from 'lucide-react';

interface ObjectiveHeaderProps {
  objective: string;
}

export function ObjectiveHeader({ objective }: ObjectiveHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 md:p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="mb-0.5 text-sm">Current Objective</h2>
            <p className="text-blue-50 opacity-90 text-sm">{objective}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
