import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

const FLOW_STAGES = [
  { label: 'network.flow.demand', meta: 'network.flow.demand.meta' },
  { label: 'network.flow.verified', meta: 'network.flow.verified.meta' },
  { label: 'network.flow.matching', meta: 'network.flow.matching.meta' },
  { label: 'network.flow.donors', meta: 'network.flow.donors.meta' }
];

@Component({
  selector: 'app-network',
  imports: [TranslatePipe],
  templateUrl: './network.component.html'
})
export class NetworkComponent {
  readonly bloodGroups = BLOOD_GROUPS;
  readonly flowStages = FLOW_STAGES;
}
