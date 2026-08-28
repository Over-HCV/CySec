/** Si GitHub está configurado y dónde se instala la App. */
import { appConfig, installUrl } from '../../utils/gh/app'

export default defineEventHandler(() => {
  const config = appConfig()
  return {
    configured: config !== null,
    installUrl: config ? installUrl(config) : null
  }
})
