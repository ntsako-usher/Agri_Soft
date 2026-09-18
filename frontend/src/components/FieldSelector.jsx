import { useFarm } from '../context/FarmContext';
import Dropdown from './ui/Dropdown';

export default function FieldSelector() {
  const { fields, selectedField, selectField } = useFarm();
  if (!selectedField) return null;
  return (
    <Dropdown
      label="Select field"
      value={selectedField.id}
      onChange={selectField}
      options={fields.map((f) => ({ value: f.id, label: f.name }))}
    />
  );
}
