import { SetupScreen } from '../features/setup/views/SetupScreen';
import { useBibleSetupViewModel } from '../features/setup/view-models/useBibleSetupViewModel';
import { openBundledBible } from '../infrastructure/repositories/openBundledBible';

// Composition root: future repositories, services, and ViewModels are wired here.
export function CarryApp() {
  const bible = useBibleSetupViewModel(openBundledBible);
  return <SetupScreen bible={bible} />;
}
