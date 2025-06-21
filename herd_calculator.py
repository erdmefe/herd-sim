from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List
import json
import sys
import random
from dateutil.relativedelta import relativedelta
import pickle
import base64

@dataclass
class Cow:
    is_pregnant: bool
    months_until_birth: int = None
    months_until_next_pregnancy: int = None
    is_milking: bool = False
    has_given_birth: bool = False
    age_months: int = 0
    is_dead: bool = False

@dataclass
class Calf:
    is_female: bool
    age_months: int = 0
    birth_date: datetime = None
    is_dead: bool = False

class HerdManager:
    def __init__(self, initial_cow_count=10, initial_pregnancy_month=6, 
                 monthly_new_cows=1, new_cow_pregnancy_month=6, 
                 milking_threshold=2, calf_maturity_age=14,
                 male_calf_removal_age=6, birth_success_rate=95,
                 use_female_sperm=False, start_year=2026, start_month=9,
                 post_birth_wait=2, milk_per_cow=25, milk_price=21,
                 feed_cost_per_cow=150, other_expenses=25000,
                 male_calf_price=15000, calf_feed_ratio=0.2,
                 auto_add_cows=False, female_cow_threshold=2,
                 max_auto_add_cows=3, cow_source_type='external',
                 new_cow_price=75000, herd_size_limit=None, old_cow_price=50000,
                 enable_deaths=False, monthly_cow_death_rate=0.5, monthly_calf_death_rate=0.5,
                 enable_cow_addition=True, cow_addition_frequency=1,
                 staff_salary=15000, staff_per_animal=30,
                 enable_profit_based_purchase=False, profit_threshold_for_purchase=100000,
                 max_profit_based_purchase=2,
                 stop_purchase_at_limit=True):
        
        self.cows: List[Cow] = []
        self.calves: List[Calf] = []
        self.current_date = datetime(start_year, start_month, 1)
        self.total_removed_male_calves = 0
        self.total_removed_old_cows = 0
        self.total_dead_cows = 0
        self.total_dead_calves = 0
        self.monthly_dead_cows = 0
        self.monthly_dead_calves = 0
        self.profit_purchase_expense = 0
        self.monthly_cow_expenses = 0
        self.months_since_last_addition = 0
        self.monthly_stats = []
        self.addition_months = []
        # DEĞİŞİKLİK 1: Yeni geçici değişkeni başlat
        self.auto_added_this_month = 0

        self.monthly_new_cows = monthly_new_cows
        self.new_cow_pregnancy_month = new_cow_pregnancy_month
        self.milking_threshold = milking_threshold
        self.calf_maturity_age = calf_maturity_age
        self.male_calf_removal_age = male_calf_removal_age
        self.birth_success_rate = birth_success_rate
        self.use_female_sperm = use_female_sperm
        self.post_birth_wait = post_birth_wait
        self.enable_cow_addition = enable_cow_addition
        self.cow_addition_frequency = cow_addition_frequency
        self.auto_add_cows = auto_add_cows
        self.female_cow_threshold = female_cow_threshold
        self.max_auto_add_cows = max_auto_add_cows
        self.milk_per_cow = milk_per_cow
        self.milk_price = milk_price
        self.feed_cost_per_cow = feed_cost_per_cow
        self.other_expenses = other_expenses
        self.male_calf_price = male_calf_price
        self.calf_feed_ratio = calf_feed_ratio
        self.cow_source_type = cow_source_type
        self.new_cow_price = new_cow_price
        self.herd_size_limit = herd_size_limit
        self.old_cow_price = old_cow_price
        self.enable_deaths = enable_deaths
        self.monthly_cow_death_rate = monthly_cow_death_rate
        self.monthly_calf_death_rate = monthly_calf_death_rate
        self.staff_salary = staff_salary
        self.staff_per_animal = staff_per_animal
        self.enable_profit_based_purchase = enable_profit_based_purchase
        self.profit_threshold_for_purchase = profit_threshold_for_purchase
        self.max_profit_based_purchase = max_profit_based_purchase
        self.stop_purchase_at_limit = stop_purchase_at_limit

        for _ in range(initial_cow_count):
            if initial_pregnancy_month == 'random':
                preg_month = random.randint(1, 9)
            else:
                preg_month = initial_pregnancy_month
                
            months_until_birth = 9 - preg_month + 1
            self.cows.append(Cow(
                is_pregnant=True,
                months_until_birth=months_until_birth,
                is_milking=months_until_birth > self.milking_threshold,
                has_given_birth=True,
                age_months=0,
                is_dead=False
            ))

    def add_monthly_cow(self):
        self.monthly_cow_expenses = 0
        # DEĞİŞİKLİK 2: Her ay başında geçici sayacı sıfırla
        self.auto_added_this_month = 0
        
        # NOT: 'Buzağıdan Otomatik Ekle' özelliğinin 'Periyodik İnek Ekle' frekansına bağlı
        # çalışması şu anki mantıktır. Eğer bunun her ay çalışmasını isterseniz,
        # 'if self.auto_add_cows:' bloğunun tamamını bu fonksiyonun dışına, process_month'a taşımak gerekir.
        # Şimdilik sadece raporlama hatasını düzeltiyoruz.
        
        if not self.enable_cow_addition:
            return
            
        self.months_since_last_addition += 1
        if self.months_since_last_addition < self.cow_addition_frequency:
            return
            
        self.months_since_last_addition = 0
        
        for _ in range(self.monthly_new_cows):
            if self.new_cow_pregnancy_month == 'random':
                preg_month = random.randint(1, 9)
            else:
                preg_month = self.new_cow_pregnancy_month
                
            months_until_birth = 9 - preg_month + 1
            new_cow = Cow(
                is_pregnant=True,
                months_until_birth=months_until_birth,
                is_milking=months_until_birth > self.milking_threshold,
                has_given_birth=True,
                age_months=0,
                is_dead=False
            )
            self.cows.append(new_cow)
            
            if self.cow_source_type == 'internal':
                self.monthly_cow_expenses += self.new_cow_price

        if self.auto_add_cows:
            female_calves = sorted(
                [calf for calf in self.calves if calf.is_female],
                key=lambda x: x.age_months,
                reverse=True
            )
            
            auto_add_count = min(
                len(female_calves) // self.female_cow_threshold,
                self.max_auto_add_cows
            )
            
            if auto_add_count > 0:
                # DEĞİŞİKLİK 3: Hesaplanan sayıyı geçici değişkene ata
                self.auto_added_this_month = auto_add_count

                calves_to_remove = female_calves[:auto_add_count * self.female_cow_threshold]
                
                self.calves = [calf for calf in self.calves if calf not in calves_to_remove]
                
                for _ in range(auto_add_count):
                    if self.new_cow_pregnancy_month == 'random':
                        preg_month = random.randint(1, 9)
                    else:
                        preg_month = self.new_cow_pregnancy_month
                        
                    months_until_birth = 9 - preg_month + 1
                    new_cow = Cow(
                        is_pregnant=True,
                        months_until_birth=months_until_birth,
                        is_milking=months_until_birth > self.milking_threshold,
                        has_given_birth=True,
                        age_months=0,
                        is_dead=False
                    )
                    self.cows.append(new_cow)
                    
                    if self.cow_source_type == 'internal':
                        self.monthly_cow_expenses += self.new_cow_price
    
    def remove_old_cows(self):
        if not self.herd_size_limit:
            return 0

        total_living_animals = sum(1 for cow in self.cows if not cow.is_dead) + sum(1 for calf in self.calves if not calf.is_dead)
        if total_living_animals <= self.herd_size_limit:
            return 0

        excess_animals = total_living_animals - self.herd_size_limit
        
        sorted_living_cows = sorted(
            [cow for cow in self.cows if not cow.is_dead],
            key=lambda x: x.age_months,
            reverse=True
        )
        
        removed_count = min(excess_animals, len(sorted_living_cows))
        cows_to_keep = sorted_living_cows[removed_count:]
        
        self.cows = [cow for cow in self.cows if cow.is_dead or cow in cows_to_keep]
        self.total_removed_old_cows += removed_count
        
        return removed_count

    def process_deaths(self):
        if not self.enable_deaths:
            self.monthly_dead_cows = 0
            self.monthly_dead_calves = 0
            return

        alive_cows = [cow for cow in self.cows if not cow.is_dead]
        dead_cows = []
        for cow in alive_cows:
            if random.random() < (self.monthly_cow_death_rate / 100):
                dead_cows.append(cow)
        
        alive_calves = [calf for calf in self.calves if not calf.is_dead]
        dead_calves = []
        for calf in alive_calves:
            if random.random() < (self.monthly_calf_death_rate / 100):
                dead_calves.append(calf)
        
        for cow in dead_cows:
            cow.is_dead = True
        for calf in dead_calves:
            calf.is_dead = True
        
        self.monthly_dead_cows = len(dead_cows)
        self.monthly_dead_calves = len(dead_calves)
        self.total_dead_cows += self.monthly_dead_cows
        self.total_dead_calves += self.monthly_dead_calves

    def process_profit_based_purchase(self):
        if not self.enable_profit_based_purchase or not self.new_cow_price > 0:
            return 0, 0

        if self.stop_purchase_at_limit and self.herd_size_limit:
            total_living_animals = sum(1 for cow in self.cows if not cow.is_dead) + sum(1 for calf in self.calves if not calf.is_dead)
            if total_living_animals >= self.herd_size_limit:
                return 0, 0

        provisional_income = self.calculate_income(
            milking_cows=sum(1 for c in self.cows if c.is_milking and not c.is_dead)
        )
        provisional_expenses = self.calculate_expenses(is_addition_month=self.months_since_last_addition == 0)
        provisional_profit = provisional_income - provisional_expenses

        cows_to_buy = 0
        purchase_cost = 0

        if provisional_profit > self.profit_threshold_for_purchase:
            excess_profit = provisional_profit - self.profit_threshold_for_purchase
            
            allowed_by_profit = int(excess_profit // self.new_cow_price)
            
            cows_to_buy = min(allowed_by_profit, self.max_profit_based_purchase)

            if cows_to_buy > 0:
                for _ in range(cows_to_buy):
                    if self.new_cow_pregnancy_month == 'random':
                        preg_month = random.randint(1, 9)
                    else:
                        preg_month = self.new_cow_pregnancy_month
                    
                    months_until_birth = 9 - preg_month + 1
                    self.cows.append(Cow(
                        is_pregnant=True,
                        months_until_birth=months_until_birth,
                        is_milking=months_until_birth > self.milking_threshold,
                        has_given_birth=True, age_months=0, is_dead=False
                    ))
                
                purchase_cost = cows_to_buy * self.new_cow_price
        
        return cows_to_buy, purchase_cost
    
    def process_month(self):
        for cow in self.cows:
            if not cow.is_dead:
                cow.age_months += 1

        new_calves = []
        
        for cow in self.cows:
            if cow.is_dead:
                continue

            if cow.is_pregnant:
                cow.months_until_birth -= 1
                
                if cow.months_until_birth <= 0:
                    birth_success = random.random() * 100 < self.birth_success_rate
                    
                    if birth_success:
                        female_probability = 0.9 if self.use_female_sperm else 0.5
                        is_female = random.random() < female_probability
                        new_calves.append(Calf(
                            is_female=is_female,
                            age_months=0,
                            birth_date=self.current_date,
                            is_dead=False
                        ))
                        cow.has_given_birth = True
                        cow.is_milking = True
                    
                    cow.is_pregnant = False
                    cow.months_until_birth = None
                    cow.months_until_next_pregnancy = self.post_birth_wait
                
                elif cow.months_until_birth <= self.milking_threshold:
                    cow.is_milking = False
                else:
                    cow.is_milking = cow.has_given_birth
            
            else:
                if cow.months_until_next_pregnancy is not None:
                    cow.months_until_next_pregnancy -= 1
                    
                    if cow.months_until_next_pregnancy <= 0:
                        cow.is_pregnant = True
                        cow.months_until_birth = 9
                        cow.months_until_next_pregnancy = None
                        cow.is_milking = cow.has_given_birth
                
                cow.is_milking = cow.has_given_birth

        self.calves.extend(new_calves)

        for calf in self.calves:
            if not calf.is_dead:
                calf.age_months += 1

        mature_female_calves = []
        remaining_calves = []

        for calf in self.calves:
            if calf.is_dead:
                remaining_calves.append(calf)
                continue

            if calf.age_months >= self.calf_maturity_age and calf.is_female:
                mature_female_calves.append(calf)
            else:
                remaining_calves.append(calf)

        for _ in mature_female_calves:
            self.cows.append(Cow(
                is_pregnant=True,
                months_until_birth=9,
                is_milking=False,
                has_given_birth=False,
                age_months=0,
                is_dead=False
            ))

        removed_males = sum(1 for calf in self.calves 
                          if not calf.is_dead and not calf.is_female and 
                          calf.age_months >= self.male_calf_removal_age)
        self.total_removed_male_calves += removed_males

        self.calves = [calf for calf in remaining_calves 
                      if not (
                          not calf.is_dead and
                          ((calf.age_months >= self.calf_maturity_age and calf.is_female) or
                           (calf.age_months >= self.male_calf_removal_age and not calf.is_female))
                      )]

        self.add_monthly_cow()
        self.remove_old_cows()
        self.process_deaths()

        cows_before_profit_purchase = sum(1 for c in self.cows if not c.is_dead)
        calves_before_profit_purchase = sum(1 for c in self.calves if not c.is_dead)

        cows_bought_this_month, profit_purchase_cost = self.process_profit_based_purchase()
        self.profit_purchase_expense = profit_purchase_cost

        self.current_date += relativedelta(months=1)
        
        self.monthly_stats.append(self.get_statistics(
            cows_bought_with_profit=cows_bought_this_month,
            cows_at_start=cows_before_profit_purchase,
            calves_at_start=calves_before_profit_purchase
        ))

    def calculate_income(self, milking_cows, removed_male_calves=None, current_removed_old_cows=None):
        daily_milk = float(milking_cows) * float(self.milk_per_cow)
        monthly_milk = daily_milk * 30.0
        milk_income = monthly_milk * float(self.milk_price)
        
        if removed_male_calves is not None:
            male_calf_income = float(removed_male_calves) * float(self.male_calf_price)
        else:
            removable_male_calves = sum(1 for calf in self.calves 
                if not calf.is_female and not calf.is_dead and calf.age_months >= self.male_calf_removal_age)
            male_calf_income = float(removable_male_calves) * float(self.male_calf_price)
        
        if current_removed_old_cows is not None:
            old_cow_income = float(current_removed_old_cows) * float(self.old_cow_price)
        else:
            if not self.monthly_stats:
                previous_removed_old_cows = 0
            else:
                previous_removed_old_cows = self.monthly_stats[-1]['total_removed_old_cows']
            current_removed_old_cows = self.total_removed_old_cows - previous_removed_old_cows
            old_cow_income = float(current_removed_old_cows) * float(self.old_cow_price)
        
        total_income = milk_income + male_calf_income + old_cow_income
        return total_income

    def calculate_expenses(self, total_cows=None, total_calves=None, is_addition_month=False, auto_added_cows=0, extra_profit_purchase_cost=0):
        if total_cows is None:
            total_cows = sum(1 for cow in self.cows if not cow.is_dead)
        if total_calves is None:
            total_calves = sum(1 for c in self.calves if not c.is_dead)

        daily_feed_cost = float(total_cows) * float(self.feed_cost_per_cow)
        monthly_feed_cost = daily_feed_cost * 30.0
        
        daily_calf_feed_cost = float(total_calves) * (float(self.feed_cost_per_cow) * float(self.calf_feed_ratio))
        monthly_calf_feed_cost = daily_calf_feed_cost * 30.0
        
        new_cow_cost = 0.0
        if self.cow_source_type == 'internal' and is_addition_month:
            new_cow_cost += float(self.monthly_new_cows) * float(self.new_cow_price)
            if self.auto_add_cows:
                new_cow_cost += float(auto_added_cows) * float(self.new_cow_price)
        
        total_animals = total_cows + total_calves
        staff_count = total_animals // self.staff_per_animal if self.staff_per_animal > 0 else 0
        staff_expense = staff_count * self.staff_salary
        
        other_expenses = float(self.other_expenses)
        
        profit_purchase_cost = self.profit_purchase_expense if extra_profit_purchase_cost == 0 else extra_profit_purchase_cost
        
        total_expenses = (monthly_feed_cost + monthly_calf_feed_cost + new_cow_cost + 
                          staff_expense + other_expenses + profit_purchase_cost)
        return total_expenses

    def get_statistics(self, cows_bought_with_profit=0, cows_at_start=0, calves_at_start=0):
        milking_cows = sum(1 for cow in self.cows if cow.is_milking and not cow.is_dead)
        dry_cows = sum(1 for cow in self.cows if not cow.is_milking and cow.has_given_birth and not cow.is_dead)
        pregnant_heifers = sum(1 for cow in self.cows if cow.is_pregnant and not cow.has_given_birth and not cow.is_dead)
        pregnant_cows = sum(1 for cow in self.cows if cow.is_pregnant and cow.has_given_birth and not cow.is_dead)
        female_calves = sum(1 for calf in self.calves if calf.is_female and not calf.is_dead)
        male_calves = sum(1 for calf in self.calves if not calf.is_female and not calf.is_dead)
        total_cows = sum(1 for c in self.cows if not c.is_dead)
        total_calves = sum(1 for c in self.calves if not c.is_dead)
        total_animals = total_cows + total_calves

        milking_ratio = round((milking_cows / total_cows * 100) if total_cows > 0 else 0, 1)
        
        if not self.monthly_stats:
            previous_removed_males = 0
            previous_removed_old_cows = 0
        else:
            previous_removed_males = self.monthly_stats[-1]['total_removed_male_calves']
            previous_removed_old_cows = self.monthly_stats[-1]['total_removed_old_cows']
        
        current_removed_males = self.total_removed_male_calves - previous_removed_males
        current_removed_old_cows = self.total_removed_old_cows - previous_removed_old_cows
        
        is_addition_month = self.enable_cow_addition and self.months_since_last_addition == 0
        
        # DEĞİŞİKLİK 4: Artık yeniden hesaplama yok, doğrudan geçici değişkenden oku.
        auto_added_cows = self.auto_added_this_month
        
        manual_cows_added_this_month = self.monthly_new_cows if is_addition_month and self.enable_cow_addition else 0

        income = self.calculate_income(milking_cows, current_removed_males, current_removed_old_cows)
        expenses = self.calculate_expenses()
        profit = income - expenses
        
        self.profit_purchase_expense = 0

        return {
            'date': self.current_date.strftime('%Y-%m'),
            'milking_cows': milking_cows,
            'dry_cows': dry_cows,
            'pregnant_heifers': pregnant_heifers,
            'pregnant_cows': pregnant_cows,
            'female_calves': female_calves,
            'male_calves': male_calves,
            'total_animals': total_animals,
            'total_removed_male_calves': self.total_removed_male_calves,
            'total_removed_old_cows': self.total_removed_old_cows,
            'current_removed_old_cows': current_removed_old_cows,
            'current_removed_males': current_removed_males,
            'milking_ratio': milking_ratio,
            'income': round(income),
            'expenses': round(expenses),
            'profit': round(profit),
            'auto_added_cows': auto_added_cows,
            'manual_cows_added': manual_cows_added_this_month,
            'old_cow_price': self.old_cow_price,
            'total_dead_cows': self.total_dead_cows,
            'total_dead_calves': self.total_dead_calves,
            'monthly_dead_cows': self.monthly_dead_cows,
            'monthly_dead_calves': self.monthly_dead_calves,
            'is_addition_month': is_addition_month,
            'cows_bought_with_profit': cows_bought_with_profit,
            'cows_at_start': cows_at_start,
            'calves_at_start': calves_at_start
        }

def main():
    params = json.loads(sys.argv[1])
    
    herd = HerdManager(
        initial_cow_count=params['initial_cow_count'],
        initial_pregnancy_month=params['initial_pregnancy_month'],
        monthly_new_cows=params['monthly_new_cows'],
        new_cow_pregnancy_month=params['new_cow_pregnancy_month'],
        milking_threshold=params['milking_threshold'],
        calf_maturity_age=params['calf_maturity_age'],
        male_calf_removal_age=params['male_calf_removal_age'],
        birth_success_rate=params['birth_success_rate'],
        use_female_sperm=params['use_female_sperm'],
        start_year=params['start_year'],
        start_month=params['start_month'],
        post_birth_wait=params['post_birth_wait'],
        milk_per_cow=params['milk_per_cow'],
        milk_price=params['milk_price'],
        feed_cost_per_cow=params['feed_cost_per_cow'],
        other_expenses=params['other_expenses'],
        male_calf_price=params['male_calf_price'],
        calf_feed_ratio=params['calf_feed_ratio'],
        auto_add_cows=params.get('auto_add_cows', False),
        female_cow_threshold=params.get('female_cow_threshold', 2),
        max_auto_add_cows=params.get('max_auto_add_cows', 3),
        cow_source_type=params.get('cow_source_type', 'external'),
        new_cow_price=params.get('new_cow_price', 75000),
        herd_size_limit=params.get('herd_size_limit'),
        old_cow_price=params.get('old_cow_price', 50000),
        enable_deaths=params.get('enable_deaths', False),
        monthly_cow_death_rate=params.get('monthly_cow_death_rate', 0.5),
        monthly_calf_death_rate=params.get('monthly_calf_death_rate', 0.5),
        enable_cow_addition=params.get('enable_cow_addition', True),
        cow_addition_frequency=params.get('cow_addition_frequency', 1),
        staff_salary=params.get('staff_salary', 15000),
        staff_per_animal=params.get('staff_per_animal', 30),
        enable_profit_based_purchase=params.get('enable_profit_based_purchase', False),
        profit_threshold_for_purchase=params.get('profit_threshold_for_purchase', 100000),
        max_profit_based_purchase=params.get('max_profit_based_purchase', 2),
        stop_purchase_at_limit=params.get('stop_purchase_at_limit', True)
    )
    
    for _ in range(params['months']):
        herd.process_month()
    
    results = herd.monthly_stats
    
    print(json.dumps(results))

if __name__ == '__main__':
    main()