import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth-utils'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.customer.findFirst()
    if (existing) {
      return NextResponse.json({ message: 'Database already seeded', seeded: false })
    }

    // Create admin user (phone: 000000)
    const adminPassword = await hashPassword('admin123')
    const admin = await db.customer.create({
      data: {
        phone: '000000',
        email: 'admin@restaurant.com',
        name: 'Admin',
        password: adminPassword,
        role: 'admin',
        points: 99999,
      }
    })

    // Create employee user
    const empPassword = await hashPassword('emp123')
    const employee = await db.customer.create({
      data: {
        phone: '111111',
        email: 'employee@restaurant.com',
        name: 'Staff Member',
        password: empPassword,
        role: 'employee',
        points: 0,
      }
    })

    // Create demo customer
    const custPassword = await hashPassword('cust123')
    const customer = await db.customer.create({
      data: {
        phone: '123456',
        email: 'customer@example.com',
        name: 'John Doe',
        password: custPassword,
        role: 'customer',
        points: 500,
        totalVisits: 3,
      }
    })

    // Create another demo customer
    const cust2Password = await hashPassword('cust123')
    const customer2 = await db.customer.create({
      data: {
        phone: '654321',
        email: 'jane@example.com',
        name: 'Jane Smith',
        password: cust2Password,
        role: 'customer',
        points: 320,
        totalVisits: 5,
      }
    })

    // Create missions for customers
    await db.mission.createMany({
      data: [
        { customerId: customer.id, type: 'visit_5', title: 'Visit 5 Times', target: 5, progress: 3, points: 200 },
        { customerId: customer.id, type: 'visit_10', title: 'Visit 10 Times', target: 10, progress: 3, points: 500 },
        { customerId: customer.id, type: 'spend_200', title: 'Spend $200 Total', target: 200, progress: 75, points: 300 },
        { customerId: customer2.id, type: 'visit_5', title: 'Visit 5 Times', target: 5, progress: 5, points: 0 },
        { customerId: customer2.id, type: 'visit_10', title: 'Visit 10 Times', target: 10, progress: 5, points: 500 },
        { customerId: customer2.id, type: 'spend_200', title: 'Spend $200 Total', target: 200, progress: 120, points: 300 },
      ]
    })

    // Update completed mission
    await db.mission.updateMany({
      where: { customerId: customer2.id, type: 'visit_5' },
      data: { completed: true }
    })

    // Create menu items
    await db.menuItem.createMany({
      data: [
        { name: 'Classic Burger', description: 'Juicy beef patty with lettuce, tomato, and special sauce', price: 12.99, category: 'Burgers' },
        { name: 'Cheese Burger', description: 'Classic burger with melted cheddar cheese', price: 14.99, category: 'Burgers' },
        { name: 'Bacon Burger', description: 'Classic burger with crispy bacon strips', price: 16.99, category: 'Burgers' },
        { name: 'Veggie Burger', description: 'Plant-based patty with fresh vegetables', price: 13.99, category: 'Burgers' },
        { name: 'Espresso', description: 'Rich and bold single shot espresso', price: 4.99, category: 'Coffee' },
        { name: 'Cappuccino', description: 'Espresso with steamed milk foam', price: 5.99, category: 'Coffee' },
        { name: 'Latte', description: 'Espresso with steamed milk', price: 6.49, category: 'Coffee' },
        { name: 'Mocha', description: 'Espresso with chocolate and steamed milk', price: 6.99, category: 'Coffee' },
        { name: 'Caesar Salad', description: 'Fresh romaine with caesar dressing and croutons', price: 10.99, category: 'Salads' },
        { name: 'Greek Salad', description: 'Mixed greens with feta and olives', price: 9.99, category: 'Salads' },
        { name: 'French Fries', description: 'Crispy golden fries with sea salt', price: 5.99, category: 'Sides' },
        { name: 'Onion Rings', description: 'Beer-battered onion rings', price: 6.99, category: 'Sides' },
        { name: 'Chocolate Cake', description: 'Rich chocolate layer cake', price: 8.99, category: 'Desserts' },
        { name: 'Cheesecake', description: 'New York style cheesecake', price: 7.99, category: 'Desserts' },
      ]
    })

    // Create rewards
    await db.reward.createMany({
      data: [
        { name: 'Free Espresso', description: 'Enjoy a free espresso on us!', pointsCost: 100 },
        { name: 'Free Cappuccino', description: 'A complimentary cappuccino', pointsCost: 150 },
        { name: 'Free French Fries', description: 'Crispy fries for free', pointsCost: 200 },
        { name: '$5 Off Your Order', description: 'Get $5 discount on any order', pointsCost: 250 },
        { name: 'Free Caesar Salad', description: 'Fresh caesar salad on the house', pointsCost: 350 },
        { name: 'Free Classic Burger', description: 'Our signature burger for free', pointsCost: 500 },
        { name: 'Free Dessert', description: 'Choose any dessert from our menu', pointsCost: 300 },
        { name: 'Buy 1 Get 1 Coffee', description: 'Get two coffees for the price of one', pointsCost: 180 },
        { name: '$10 Off Your Order', description: 'Get $10 discount on any order', pointsCost: 500 },
        { name: 'VIP Experience', description: 'Priority seating + free appetizer', pointsCost: 1000 },
      ]
    })

    // Create app settings
    await db.appSetting.createMany({
      data: [
        { key: 'points_per_currency', value: '1' },
        { key: 'game_cost_burger_catch', value: '50' },
        { key: 'game_cost_coffee_shooter', value: '50' },
        { key: 'game_cost_grand_wheel', value: '100' },
        { key: 'game_cooldown_burger_catch', value: '7' },
        { key: 'game_cooldown_coffee_shooter', value: '7' },
        { key: 'game_cooldown_grand_wheel', value: '30' },
        { key: 'mission_target_visit_5', value: '5' },
        { key: 'mission_target_visit_10', value: '10' },
        { key: 'mission_target_spend_200', value: '200' },
      ]
    })

    // Create some visits
    await db.visit.createMany({
      data: [
        { customerId: customer.id, invoiceAmount: 25.99, pointsEarned: 25, createdBy: employee.id },
        { customerId: customer.id, invoiceAmount: 18.50, pointsEarned: 18, createdBy: employee.id },
        { customerId: customer.id, invoiceAmount: 32.00, pointsEarned: 32, createdBy: employee.id },
        { customerId: customer2.id, invoiceAmount: 45.00, pointsEarned: 45, createdBy: employee.id },
        { customerId: customer2.id, invoiceAmount: 15.00, pointsEarned: 15, createdBy: employee.id },
      ]
    })

    return NextResponse.json({
      message: 'Database seeded successfully',
      seeded: true,
      credentials: {
        admin: { phone: '000000', password: 'admin123' },
        employee: { phone: '111111', password: 'emp123' },
        customer: { phone: '123456', password: 'cust123' },
        customer2: { phone: '654321', password: 'cust123' },
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
