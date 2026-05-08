import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function Results() {
  const { data: fights = [] } = useQuery({
    queryKey: ['fights'],
    queryFn: () => base44.entities.Fight.list('-created_date', 100),
  });

  const finishedFights = fights.filter(f => f.status === 'finished');

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-wide mb-8">RESULTS</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {finishedFights.map(fight => {
          const winnerColor = fight.winner === 'meron' ? 'border-red-500 bg-red-500/10'
            : fight.winner === 'wala' ? 'border-blue-500 bg-blue-500/10'
            : fight.winner === 'draw' ? 'border-green-500 bg-green-500/10'
            : 'border-muted bg-muted/50';

          return (
            <Card key={fight.id} className={`p-4 text-center border-2 ${winnerColor}`}>
              <p className="font-heading text-2xl font-bold text-primary">{fight.fight_number}</p>
              <p className={`font-heading text-sm font-bold mt-2 ${
                fight.winner === 'meron' ? 'text-red-400' : fight.winner === 'wala' ? 'text-blue-400' : 'text-green-400'
              }`}>
                {fight.winner?.toUpperCase()}
              </p>
              <div className="mt-2 text-[10px] text-muted-foreground space-y-0.5">
                <p className="text-red-400/70">{fight.meron_name}</p>
                <p className="text-blue-400/70">{fight.wala_name}</p>
              </div>
            </Card>
          );
        })}
        {finishedFights.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-heading text-lg">NO RESULTS YET</p>
          </div>
        )}
      </div>
    </div>
  );
}