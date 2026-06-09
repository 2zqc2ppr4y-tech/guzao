import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { fetchProfile } from '../api'
import { clearAuth } from '../auth'
import { LogoutButton } from '../components/Layout'
import { DataTable, formatPercent, PageIntro, Panel, StatCard } from '../components/ui'

export default function ProfilePage({ auth, onAuthChange, onNotify }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchProfile()
      .then(setProfile)
      .catch((error) => onNotify?.('error', error.message))
      .finally(() => setLoading(false))
  }, [onNotify, auth?.token])

  if (!auth?.token) {
    return (
      <div className="grid gap-6">
        <PageIntro eyebrow="个人中心" title="请先登录账户" text="登录后可查看真实识别记录、反馈记录和个人统计。" />
        <Panel>
          <p className="text-slate-300">请点击右上角“登录”进入账户。</p>
        </Panel>
      </div>
    )
  }

  const summary = profile?.summary || {}
  const recent = profile?.recent || []

  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="个人中心"
        title={profile?.user?.display_name || auth?.user?.display_name || '个人中心'}
        text="这里只展示当前账户在本地数据库中的真实识别、复核与统计数据。"
        action={<LogoutButton onDone={() => { clearAuth(); onAuthChange?.(null); onNotify?.('success', '已退出登录。') }} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="识别记录" value={summary.identification_total || 0} hint="当前账户 records 表" icon={UserRound} />
        <StatCard label="反馈记录" value={summary.feedback_total || 0} hint="当前账户 feedback 表" icon={UserRound} />
        <StatCard label="平均置信度" value={formatPercent(summary.average_confidence || 0)} hint="按真实识别记录统计" icon={UserRound} />
        <StatCard label="平均图像质量" value={summary.average_quality || 0} hint="上传图片质量评分均值" icon={UserRound} />
        <StatCard label="人工确认准确率" value={formatPercent(summary.accuracy_rate || 0)} hint="基于已反馈记录" icon={UserRound} />
      </section>

      <Panel>
        <h2 className="panel-title">最近识别记录</h2>
        <div className="mt-4">
          {loading ? (
            <p className="text-slate-300">正在读取真实账户数据...</p>
          ) : recent.length ? (
            <DataTable
              headers={['时间', '类别', '置信度', '目标数', '模式']}
              rows={recent.map((item) => [
                item.identify_time,
                item.species,
                formatPercent(item.confidence),
                item.cell_count || item.detections?.length || 0,
                item.inference_mode
              ])}
            />
          ) : (
            <p className="text-slate-300">当前账户还没有真实识别记录。</p>
          )}
        </div>
      </Panel>
    </div>
  )
}
