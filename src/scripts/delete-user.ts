import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function main({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const userService = container.resolve(Modules.USER)
  
  const users = await userService.listUsers({ email: 'zakaz@24-karat.ru' })
  if (users.length > 0) {
    await userService.deleteUsers([users[0].id])
    logger.info('User deleted successfully')
  } else {
    logger.info('User not found')
  }
}
