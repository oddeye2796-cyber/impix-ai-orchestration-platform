/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

import { getPlantState, PlantState, subscribeToPlant } from '../services/telemetry';

/** Subscribe a component to the shared plant simulation. */
export function useTelemetry(): PlantState {
  const [state, setState] = useState<PlantState>(getPlantState);
  useEffect(() => subscribeToPlant(setState), []);
  return state;
}
