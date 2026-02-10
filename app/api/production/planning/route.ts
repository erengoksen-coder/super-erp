import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Üretim planlama verileri (açıklamalı, tarihli)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()

    // Tüm aktif üretim emirlerini getir
    const orders = db.prepare(`
      SELECT 
        po.id,
        po.order_number,
        po.quantity,
        po.status,
        po.current_station,
        po.created_at,
        po.due_date,
        po.estimated_completion_date,
        po.iskelet_started_at,
        po.iskelet_completed_at,
        po.terzihane_started_at,
        po.terzihane_completed_at,
        po.berjer_started_at,
        po.berjer_completed_at,
        po.döseme_started_at,
        po.döseme_completed_at,
        po.montaj_started_at,
        po.montaj_completed_at,
        p.name as product_name,
        p.sku as product_sku
      FROM production_orders po
      JOIN products p ON po.product_id = p.id AND p.deleted_at IS NULL
      WHERE po.status != 'completed'
        AND po.status != 'cancelled'
      ORDER BY po.created_at ASC
    `).all()

    // İstasyon bazlı grupla
    const groupedByStation: Record<string, any[]> = {
      iskelet: [],
      terzihane: [],
      berjer: [],
      döseme: [],
      montaj: [],
      sevkiyat: [],
    }

    orders.forEach((order: any) => {
      const station = order.current_station || 'iskelet'
      if (groupedByStation[station]) {
        groupedByStation[station].push(order)
      }
    })

    // İstasyon süreleri hesapla
    const stationDurations = orders.map((order: any) => {
      const durations: Record<string, number> = {}
      
      if (order.iskelet_started_at && order.iskelet_completed_at) {
        const start = new Date(order.iskelet_started_at).getTime()
        const end = new Date(order.iskelet_completed_at).getTime()
        durations.iskelet = Math.round((end - start) / 1000 / 60) // dakika
      }
      
      if (order.terzihane_started_at && order.terzihane_completed_at) {
        const start = new Date(order.terzihane_started_at).getTime()
        const end = new Date(order.terzihane_completed_at).getTime()
        durations.terzihane = Math.round((end - start) / 1000 / 60)
      }
      
      if (order.berjer_started_at && order.berjer_completed_at) {
        const start = new Date(order.berjer_started_at).getTime()
        const end = new Date(order.berjer_completed_at).getTime()
        durations.berjer = Math.round((end - start) / 1000 / 60)
      }
      
      if (order.döseme_started_at && order.döseme_completed_at) {
        const start = new Date(order.döseme_started_at).getTime()
        const end = new Date(order.döseme_completed_at).getTime()
        durations.döseme = Math.round((end - start) / 1000 / 60)
      }
      
      if (order.montaj_started_at && order.montaj_completed_at) {
        const start = new Date(order.montaj_started_at).getTime()
        const end = new Date(order.montaj_completed_at).getTime()
        durations.montaj = Math.round((end - start) / 1000 / 60)
      }

      return {
        order_id: order.id,
        order_number: order.order_number,
        durations,
      }
    })

    // Kart bazlı sayım: sevk edilenler hariç (shipment_id boş olanlar)
    const totalCards = db.prepare(`
      SELECT COUNT(psn.id) as total_cards
      FROM product_serial_numbers psn
      JOIN production_orders po ON psn.production_order_id = po.id
      WHERE po.status != 'completed'
        AND po.status != 'cancelled'
        AND COALESCE(psn.current_station, po.current_station) IS NOT NULL
        AND (COALESCE(psn.shipment_id, '') = '')
    `).get() as { total_cards: number } | undefined

    // Aktif kartlar: emir + istasyon bazlı (sevk edilenler hariç), detay listesi için
    const stationNames: Record<string, string> = {
      iskelet: 'İskelet',
      terzihane: 'Terzihane',
      berjer: 'Berjer',
      döseme: 'Döşeme',
      montaj: 'Montaj',
      sevkiyat: 'Sevkiyat',
    }
    const activeCardsRows = db.prepare(`
      SELECT 
        po.id as order_id,
        po.order_number,
        po.quantity,
        p.name as product_name,
        COALESCE(psn.current_station, po.current_station) as station,
        COUNT(psn.id) as card_count
      FROM product_serial_numbers psn
      JOIN production_orders po ON psn.production_order_id = po.id
      JOIN products p ON po.product_id = p.id AND p.deleted_at IS NULL
      WHERE po.status != 'completed'
        AND po.status != 'cancelled'
        AND (COALESCE(psn.shipment_id, '') = '')
        AND COALESCE(psn.current_station, po.current_station) IS NOT NULL
      GROUP BY po.id, po.order_number, po.quantity, p.name, COALESCE(psn.current_station, po.current_station)
      ORDER BY po.created_at ASC, station
    `).all() as Array<{ order_id: string; order_number: string; quantity: number; product_name: string; station: string; card_count: number }>

    const active_cards = activeCardsRows.map((r) => ({
      order_id: r.order_id,
      order_number: r.order_number,
      product_name: r.product_name,
      quantity: r.quantity,
      station: r.station,
      station_label: stationNames[r.station] || r.station,
      card_count: Number(r.card_count),
    }))

    return NextResponse.json({
      orders,
      groupedByStation,
      stationDurations,
      total_orders: orders.length,
      total_quantity: orders.reduce((sum: number, o: any) => sum + o.quantity, 0),
      total_cards: totalCards?.total_cards || 0,
      active_cards,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


