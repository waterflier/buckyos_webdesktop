import { useSearchParams } from 'react-router-dom'
import { MessageHubView } from '../components/messagehub/MessageHubView'

export function MessageHubRoute() {
  const [searchParams] = useSearchParams()
  const entityId = searchParams.get('entityId')

  return <MessageHubView initialEntityId={entityId} />
}
