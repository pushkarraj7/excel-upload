'use client';

import { useEffect, useState } from 'react';

interface FilterProps {
  onChange: (filters: any) => void;
}

export default function PriceFilters({ onChange }: FilterProps) {
  const [marketCap, setMarketCap] = useState('');
  const [index1, setIndex1] = useState('');
  const [index2, setIndex2] = useState('');
  const [index3, setIndex3] = useState('');

  useEffect(() => {
    onChange({ marketCap, index1, index2, index3 });
  }, [marketCap, index1, index2, index3]);

  return (
    <div className="filters">
      <select value={marketCap} onChange={e => setMarketCap(e.target.value)}>
        <option value="">Market Cap</option>
        <option value="LARGE">Large Cap</option>
        <option value="MID">Mid Cap</option>
        <option value="SMALL">Small Cap</option>
      </select>

      <select value={index1} onChange={e => setIndex1(e.target.value)}>
        <option value="">Index 1</option>
        <option value="NIFTY50">Nifty 50</option>
        <option value="BANKNIFTY">Bank Nifty</option>
      </select>

      <select value={index2} onChange={e => setIndex2(e.target.value)}>
        <option value="">Index 2</option>
        <option value="FINNIFTY">Fin Nifty</option>
      </select>

      <select value={index3} onChange={e => setIndex3(e.target.value)}>
        <option value="">Index 3</option>
        <option value="MIDCAP100">Midcap 100</option>
      </select>
    </div>
  );
}
