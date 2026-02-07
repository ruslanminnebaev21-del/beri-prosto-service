import styles from "./page.module.css";

export default function Page() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1>Сервисная страница Бери Просто</h1>
          <p>Проект развернут. Дальше — логика и дизайн.</p>
        </section>

        <section className={styles.calendar}>
          <div className={styles.calendarHeader}>
            <h2>Февраль 2026</h2>
            <span>28 дней</span>
          </div>
          <table className={styles.calendarTable}>
            <thead>
              <tr>
                <th>Пн</th>
                <th>Вт</th>
                <th>Ср</th>
                <th>Чт</th>
                <th>Пт</th>
                <th>Сб</th>
                <th>Вс</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.calendarEmpty} />
                <td className={styles.calendarEmpty} />
                <td className={styles.calendarEmpty} />
                <td className={styles.calendarEmpty} />
                <td className={styles.calendarEmpty} />
                <td className={styles.calendarEmpty} />
                <td className={styles.calendarDay}>1</td>
              </tr>
              <tr>
                <td className={styles.calendarDay}>2</td>
                <td className={styles.calendarDay}>3</td>
                <td className={styles.calendarDay}>4</td>
                <td className={styles.calendarDay}>5</td>
                <td className={styles.calendarDay}>6</td>
                <td className={styles.calendarDay}>7</td>
                <td className={styles.calendarDay}>8</td>
              </tr>
              <tr>
                <td className={styles.calendarDay}>9</td>
                <td className={styles.calendarDay}>10</td>
                <td className={styles.calendarDay}>11</td>
                <td className={styles.calendarDay}>12</td>
                <td className={styles.calendarDay}>13</td>
                <td className={styles.calendarDay}>14</td>
                <td className={styles.calendarDay}>15</td>
              </tr>
              <tr>
                <td className={styles.calendarDay}>16</td>
                <td className={styles.calendarDay}>17</td>
                <td className={styles.calendarDay}>18</td>
                <td className={styles.calendarDay}>19</td>
                <td className={styles.calendarDay}>20</td>
                <td className={styles.calendarDay}>21</td>
                <td className={styles.calendarDay}>22</td>
              </tr>
              <tr>
                <td className={styles.calendarDay}>23</td>
                <td className={styles.calendarDay}>24</td>
                <td className={styles.calendarDay}>25</td>
                <td className={styles.calendarDay}>26</td>
                <td className={styles.calendarDay}>27</td>
                <td className={styles.calendarDay}>28</td>
                <td className={styles.calendarEmpty} />
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
