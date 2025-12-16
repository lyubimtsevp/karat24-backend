import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { DocumentText, Newspaper, FolderOpen, Tag } from "@medusajs/icons"

/**
 * Страница управления контентом Strapi из админки Medusa
 */
const StrapiContentPage = () => {
  // URL админки Strapi (в production замените на ваш домен)
  const strapiAdminUrl = import.meta.env.VITE_STRAPI_ADMIN_URL || "http://localhost:1337/admin"

  const contentLinks = [
    {
      title: "Статьи",
      description: "Управление статьями блога",
      icon: Newspaper,
      url: `${strapiAdminUrl}/content-manager/collection-types/api::article.article`,
      color: "bg-blue-500",
    },
    {
      title: "Страницы",
      description: "Управление статическими страницами",
      icon: DocumentText,
      url: `${strapiAdminUrl}/content-manager/collection-types/api::page.page`,
      color: "bg-green-500",
    },
    {
      title: "Категории",
      description: "Управление категориями контента",
      icon: FolderOpen,
      url: `${strapiAdminUrl}/content-manager/collection-types/api::category.category`,
      color: "bg-purple-500",
    },
    {
      title: "Теги",
      description: "Управление тегами",
      icon: Tag,
      url: `${strapiAdminUrl}/content-manager/collection-types/api::tag.tag`,
      color: "bg-orange-500",
    },
  ]

  return (
    <Container className="p-8">
      <div className="mb-8">
        <Heading level="h1" className="mb-2">
          Управление контентом
        </Heading>
        <Text className="text-ui-fg-subtle">
          Редактирование контента через Strapi CMS
        </Text>
      </div>

      {/* Быстрый доступ к Strapi Admin */}
      <Container className="mb-6 p-4 bg-ui-bg-subtle rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2" className="mb-1">
              Strapi Admin Panel
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Открыть полную панель управления Strapi
            </Text>
          </div>
          <Button
            variant="secondary"
            onClick={() => window.open(strapiAdminUrl, "_blank")}
          >
            Открыть Strapi
          </Button>
        </div>
      </Container>

      {/* Сетка с типами контента */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contentLinks.map((link) => {
          const Icon = link.icon
          return (
            <Container
              key={link.title}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => window.open(link.url, "_blank")}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${link.color} bg-opacity-10`}>
                  <Icon className={`text-${link.color.replace('bg-', '')}`} />
                </div>
                <div className="flex-1">
                  <Heading level="h3" className="mb-1">
                    {link.title}
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle mb-3">
                    {link.description}
                  </Text>
                  <Button variant="transparent" size="small">
                    Редактировать →
                  </Button>
                </div>
              </div>
            </Container>
          )
        })}
      </div>

      {/* Информация */}
      <Container className="mt-6 p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
        <Text size="small" className="text-ui-fg-muted">
          💡 <strong>Совет:</strong> Изменения в Strapi автоматически доступны через API Medusa
          на эндпоинтах <code>/store/articles</code>, <code>/store/pages</code> и других.
        </Text>
      </Container>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Контент",
  icon: Newspaper,
})

export default StrapiContentPage
