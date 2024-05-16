/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2023 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { NetworkService } from '../../services/network.service';
import { Observable, Subject } from 'rxjs';
import { VariablesService } from '../../services/variables.service';
import { PolkadaptService } from '../../services/polkadapt.service';

@Component({
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NetworkComponent implements OnInit, OnDestroy {
  subsquidRegistered: Observable<boolean>;
  showBottomBar = true;

  private destroyer = new Subject<void>();
  private DEFAULT_NETWORK = 'v0';

  constructor(
              private ns: NetworkService,
              private pa: PolkadaptService,
              public vars: VariablesService,
  ) {
    this.subsquidRegistered = this.pa.subsquidRegistered.asObservable();
  }

  ngOnInit(): void {
    // Set the default network.
    this.ns.setNetwork(this.DEFAULT_NETWORK)
    this.vars.network.next(this.DEFAULT_NETWORK);
    this.vars.blockNumber.next(0);

    // Pass the last loaded number to the variables service, so other parts of the application can pick it up.
    this.ns.currentNetwork.pipe(
      // Only continue if a network is set.
      filter(network => !!network),
      // Only continue if the network value has changed.
      distinctUntilChanged(),
      // Watch for new loaded block numbers from the Substrate node.
      switchMap(() => this.ns.blockHarvester.loadedNumber.pipe(
        // Only continue if new block number is larger than 0.
        filter(nr => nr > 0)
      )),
      // Keep it running until this component is destroyed.
      takeUntil(this.destroyer)
    ).subscribe({
      next: (nr) => {
        this.vars.blockNumber.next(nr);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyer.next();
    this.destroyer.complete();
    this.ns.destroy();
    this.vars.network.next('none');
    this.vars.blockNumber.next(0);
  }
}
