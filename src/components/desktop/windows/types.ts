import type { WindowRecord } from '../../../models/ui'
import type { DesktopAppItem } from '../apps/types'

export type ResizeDirection =
  | 'left'
  | 'right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'

export interface DesktopWindowDataModel extends WindowRecord {
  app: DesktopAppItem
}

export interface DesktopWindowLayerDataModel {
  windows: DesktopWindowDataModel[]
  topWindow?: DesktopWindowDataModel
}
