import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getFields } from '../services/farmService';

const FarmContext = createContext(null);

// Holds the list of fields and which one is selected, so the Overview and
// Monitoring pages always agree on the active field.
export function FarmProvider({ children }) {
  const [fields, setFields] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    getFields().then((list) => {
      setFields(list);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    });
  }, []);

  const value = useMemo(
    () => ({
      fields,
      selectedField: fields.find((f) => f.id === selectedId) ?? null,
      selectField: setSelectedId,
    }),
    [fields, selectedId],
  );
  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export const useFarm = () => useContext(FarmContext);
