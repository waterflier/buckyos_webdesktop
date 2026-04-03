import { useSearchParams } from 'react-router-dom'
import { MessageHubView } from './MessageHubView'

export function MessageHubRoute() {
  const [searchParams] = useSearchParams()
  const entityId = searchParams.get('entityId')

  return <MessageHubView initialEntityId={entityId} />
}
