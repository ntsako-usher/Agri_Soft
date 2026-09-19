import { Bell, Droplets, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePersistentState } from '../hooks/usePersistentState';
import Card, { CardHeading } from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import Toggle from '../components/ui/Toggle';

function SettingRow({ title, description, checked, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p className="text-muted text-sm">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

// These preferences are stored in this browser only. TODO: save them through the API.
export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const [autoIrrigation, setAutoIrrigation] = usePersistentState('softagri.autoIrrigation', true);
  const [rainPause, setRainPause] = usePersistentState('softagri.rainPause', true);
  const [criticalAlerts, setCriticalAlerts] = usePersistentState('softagri.criticalAlerts', true);
  const [dailySummary, setDailySummary] = usePersistentState('softagri.dailySummary', false);

  return (
    <div className="stack narrow">
      <PageHeader eyebrow="Settings" title="Preferences" description="These settings are saved in this browser for now." />

      <Card>
        <CardHeading icon={Palette} title="Appearance" />
        <SettingRow title="Dark mode" description="Use a darker palette that is easier on the eyes at night." checked={isDark} onChange={toggleTheme} />
      </Card>

      <Card>
        <CardHeading icon={Droplets} title="Irrigation" />
        <SettingRow title="Automatic irrigation" description="Water fields on the schedule without manual control." checked={autoIrrigation} onChange={setAutoIrrigation} />
        <SettingRow title="Pause when rain is expected" description="Skip a cycle if the forecast shows rain, to avoid overwatering." checked={rainPause} onChange={setRainPause} />
      </Card>

      <Card>
        <CardHeading icon={Bell} title="Notifications" />
        <SettingRow title="Critical alerts" description="Get notified straight away about smoke, intruders and low soil moisture." checked={criticalAlerts} onChange={setCriticalAlerts} />
        <SettingRow title="Daily summary" description="Receive one summary of farm conditions each morning." checked={dailySummary} onChange={setDailySummary} />
      </Card>
    </div>
  );
}
