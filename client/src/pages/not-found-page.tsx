/**
 * Shown for an unknown address.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, PageBody, PageHeader } from '@/components/common/page'

export function NotFoundPage() {
  return (
    <PageBody>
      <PageHeader title="Сторінку не знайдено" />
      <EmptyState
        title="Такої сторінки немає"
        description="Перевірте адресу або повернітесь до списку заявок."
        action={
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                На головну
              </Button>
            </Link>
            <Link to="/orders">
              <Button size="sm">До заявок</Button>
            </Link>
          </div>
        }
      />
    </PageBody>
  )
}
