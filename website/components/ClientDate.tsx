'use client';

import { useEffect, useState } from 'react';

export default function ClientDate() {
  const [year, setYear] = useState('2026');

  useEffect(() => {
    setYear(String(new Date().getFullYear()));
  }, []);

  return <>{year}</>;
}
