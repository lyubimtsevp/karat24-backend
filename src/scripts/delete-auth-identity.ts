import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function main({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const authService = container.resolve(Modules.AUTH)
  
  try {
    const identities = await authService.listAuthIdentities({ 
      provider_identities: {
        entity_id: 'zakaz@24-karat.ru'
      }
    })
    
    if (identities.length > 0) {
      await authService.deleteAuthIdentities([identities[0].id])
      logger.info('Auth identity deleted successfully')
    } else {
      logger.info('Auth identity not found')
    }
  } catch (error) {
    const err = error as Error
    logger.error('Error deleting auth identity:', err)
  }
}
