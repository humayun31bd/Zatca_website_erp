import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hardware-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hardware-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class HardwarePanelComponent {
  printers = [
    { id: 'sys', name: 'System Default Printer', type: 'OS Dialog' },
    { id: 'thermal', name: 'Thermal Receipt (80mm)', type: 'ESC/POS' }
  ];
  defaultId = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);

  setDefault(id: string) {
    this.defaultId.set(id);
    this.bannerSuccess.set('Default POS printer updated locally.');
  }
}
